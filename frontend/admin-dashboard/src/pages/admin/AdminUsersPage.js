import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const API_BASE = 'http://localhost:8000/api';

const ROLE_LABELS = {
  driver: 'Tài xế',
  attendant: 'Phụ xe',
  ticket_agent: 'Nhân viên bán vé',
  ticket_manager: 'Quản lý phòng vé',
  fleet_manager: 'Quản lý Xe',
  ops_manager: 'Quản lý Vận tải',
  general_manager: 'Ban Giám đốc',
  admin: 'Quản trị viên'
};

const ROLE_BADGE_STYLES = {
  admin: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  general_manager: { bg: '#f3e8ff', color: '#7e22ce', border: '#e9d5ff' },
  ops_manager: { bg: '#e0f2fe', color: '#0284c7', border: '#bae6fd' },
  fleet_manager: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  ticket_manager: { bg: '#e0e7ff', color: '#4338ca', border: '#c7d2fe' },
  ticket_agent: { bg: '#ccfbf1', color: '#0d9488', border: '#99f6e4' },
  driver: { bg: '#dcfce7', color: '#16a34a', border: '#bbf7d0' },
  attendant: { bg: '#fce7f3', color: '#be185d', border: '#fbcfe8' }
};

const PROVINCE_OFFICES = {
  sg: {
    provinceName: 'Chi nhánh TP. Hồ Chí Minh',
    offices: [
      { id: 'sg-bxmd', name: 'Văn phòng Bến xe Miền Đông' },
      { id: 'sg-bxmt', name: 'Văn phòng Bến xe Miền Tây' }
    ]
  },
  dl: {
    provinceName: 'Chi nhánh Đà Lạt',
    offices: [
      { id: 'dl-bxlt', name: 'Văn phòng Bến xe Liên Tỉnh' },
      { id: 'dl-btx', name: 'Văn phòng Bùi Thị Xuân' }
    ]
  },
  ct: {
    provinceName: 'Chi nhánh Cần Thơ',
    offices: [
      { id: 'ct-bxtt', name: 'Văn phòng Bến xe Trung Tâm' },
      { id: 'ct-nk', name: 'Văn phòng Ninh Kiều' }
    ]
  }
};

const STATUS_LABELS = {
  active: 'Hoạt động',
  inactive: 'Tạm ngưng',
  suspended: 'Tạm khóa'
};

const exportStaffToExcel = (staffList) => {
  if (!staffList || staffList.length === 0) {
    alert('Chưa có dữ liệu tài khoản để xuất file.');
    return;
  }

  let csvContent = '\uFEFF';
  csvContent += 'DANH SÁCH TÀI KHOẢN NGƯỜI DÙNG & PHÂN QUYỀN RBAC - AN BÌNH LINES\n';
  csvContent += `Thời gian xuất: ${new Date().toLocaleString('vi-VN')}\n\n`;
  csvContent += 'STT,Họ và tên,Số điện thoại / Đăng nhập,Email,Vai trò RBAC,Chi nhánh / Văn phòng,Trạng thái\n';

  staffList.forEach((s, idx) => {
    const nameClean = `"${(s.name || '').replace(/"/g, '""')}"`;
    const phoneClean = `"${(s.phone || '').replace(/"/g, '""')}"`;
    const emailClean = `"${(s.email || '').replace(/"/g, '""')}"`;
    const roleClean = `"${(ROLE_LABELS[s.role] || s.role || '').replace(/"/g, '""')}"`;
    const branchClean = `"${(s.assignedOffice ? `${s.branch?.branchName || 'Chi nhánh TP. HCM'} - ${s.assignedOffice}` : (s.branch?.branchName || 'Toàn hệ thống')).replace(/"/g, '""')}"`;
    const statusClean = `"${(STATUS_LABELS[s.status] || s.status || '').replace(/"/g, '""')}"`;

    csvContent += `${idx + 1},${nameClean},${phoneClean},${emailClean},${roleClean},${branchClean},${statusClean}\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Danh_Sach_Tai_Khoan_AnBinhLines_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const AdminUsersPage = () => {
  const { token } = useContext(AuthContext);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null });
  const [selectedIds, setSelectedIds] = useState([]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('ticket_agent');
  const [branchId, setBranchId] = useState('sg');
  const [assignedOffice, setAssignedOffice] = useState('Văn phòng Bến xe Miền Đông');
  const [shiftType, setShiftType] = useState('morning'); // 'morning' | 'evening'
  const [status, setStatus] = useState('active');
  const [showPassword, setShowPassword] = useState(false);
  const [sendNotify, setSendNotify] = useState(true);

  const handleBranchChange = (newBranchId) => {
    setBranchId(newBranchId);
    const availableOffices = PROVINCE_OFFICES[newBranchId]?.offices || [];
    if (availableOffices.length > 0) {
      setAssignedOffice(availableOffices[0].name);
    }
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/staff`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setStaffList(data.staff);
      }
    } catch {
      showToast('Không thể tải danh sách tài khoản người dùng.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchStaff();
    }
  }, [token]);

  const handleOpenAdd = () => {
    setEditingStaff(null);
    setName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setRole('ticket_agent');
    setBranchId('sg');
    setAssignedOffice('Văn phòng Bến xe Miền Đông');
    setShiftType('morning');
    setStatus('active');
    setShowModal(true);
  };

  const handleOpenEdit = (staff) => {
    setEditingStaff(staff);
    setName(staff.name || '');
    setEmail(staff.email || '');
    setPhone(staff.phone || '');
    setPassword('');
    setRole(staff.role || 'driver');
    const bId = staff.branch?.branchId || 'sg';
    setBranchId(bId);
    const curOffice = staff.assignedOffice || (Array.isArray(staff.branch?.assignedOffices) ? staff.branch.assignedOffices[0] : null) || PROVINCE_OFFICES[bId]?.offices[0]?.name;
    setAssignedOffice(curOffice || 'Văn phòng Bến xe Miền Đông');
    setShiftType(staff.shiftType || 'morning');
    setStatus(staff.status || 'active');
    setShowModal(true);
  };

  const handleDelete = (staff) => {
    setConfirmModal({
      show: true,
      title: 'Xác nhận xóa tài khoản',
      message: `Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản người dùng ${staff.name} (${staff.phone})?`,
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_BASE}/users/staff/${staff._id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (data.success) {
            showToast('Xóa tài khoản thành công!');
            fetchStaff();
          } else {
            showToast(data.message || 'Lỗi xóa tài khoản.', 'error');
          }
        } catch {
          showToast('Lỗi kết nối máy chủ.', 'error');
        }
      }
    });
  };

  const handleToggleStatus = async (staff) => {
    const newStatus = staff.status === 'active' ? 'suspended' : 'active';
    const actionText = newStatus === 'suspended' ? 'Khóa' : 'Kích hoạt';
    
    setConfirmModal({
      show: true,
      title: `${actionText} tài khoản người dùng`,
      message: `Bạn có chắc chắn muốn ${actionText.toLowerCase()} tài khoản ${staff.name}?`,
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_BASE}/users/staff/${staff._id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: newStatus })
          });
          const data = await res.json();
          if (data.success) {
            showToast(`${actionText} tài khoản thành công!`);
            fetchStaff();
          } else {
            showToast(data.message || 'Lỗi cập nhật trạng thái.', 'error');
          }
        } catch {
          showToast('Lỗi kết nối máy chủ.', 'error');
        }
      }
    });
  };

  const handleBulkToggleStatus = (newStatus) => {
    const actionText = newStatus === 'suspended' ? 'Khóa' : 'Mở khóa';
    setConfirmModal({
      show: true,
      title: `${actionText} hàng loạt tài khoản`,
      message: `Bạn có chắc chắn muốn ${actionText.toLowerCase()} ${selectedIds.length} tài khoản đã chọn?`,
      onConfirm: async () => {
        try {
          await Promise.all(
            selectedIds.map(id => 
              fetch(`${API_BASE}/users/staff/${id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
              })
            )
          );
          showToast(`${actionText} hàng loạt thành công ${selectedIds.length} tài khoản!`);
          setSelectedIds([]);
          fetchStaff();
        } catch {
          showToast('Có lỗi xảy ra khi cập nhật hàng loạt.', 'error');
        }
      }
    });
  };

  const handleBulkDelete = () => {
    setConfirmModal({
      show: true,
      title: 'Xóa hàng loạt tài khoản',
      message: `CẢNH BÁO: Hành động này sẽ xóa vĩnh viễn ${selectedIds.length} tài khoản đã chọn! Bạn có chắc chắn?`,
      onConfirm: async () => {
        try {
          await Promise.all(
            selectedIds.map(id => 
              fetch(`${API_BASE}/users/staff/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
              })
            )
          );
          showToast(`Đã xóa vĩnh viễn ${selectedIds.length} tài khoản thành công!`);
          setSelectedIds([]);
          fetchStaff();
        } catch {
          showToast('Có lỗi xảy ra khi xóa hàng loạt.', 'error');
        }
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !phone || (!editingStaff && !password)) {
      showToast('Vui lòng nhập đầy đủ các trường bắt buộc.', 'error');
      return;
    }

    const payload = {
      name,
      email: email || undefined,
      phone,
      role,
      status
    };

    if (['ticket_manager', 'ticket_agent'].includes(role)) {
      const bInfo = PROVINCE_OFFICES[branchId];
      payload.branch = {
        branchId,
        branchName: bInfo?.provinceName || 'Chi nhánh TP. Hồ Chí Minh',
        assignedOffices: [assignedOffice]
      };
      payload.assignedOffice = assignedOffice;
      if (role === 'ticket_agent') {
        payload.shiftType = shiftType;
        payload.shiftName = shiftType === 'evening' ? 'Ca Chiều (14:00 - 22:00)' : 'Ca Sáng (06:30 - 14:30)';
      }
    } else {
      payload.branch = {
        branchId: 'sg',
        branchName: 'Chi nhánh TP. Hồ Chí Minh (Hội sở)'
      };
    }

    if (password) {
      payload.password = password;
    }

    try {
      const url = editingStaff 
        ? `${API_BASE}/users/staff/${editingStaff._id}`
        : `${API_BASE}/users/staff`;
      const method = editingStaff ? 'PUT' : 'POST';

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
        showToast(editingStaff ? 'Cập nhật tài khoản thành công!' : 'Tạo tài khoản mới thành công!');
        setShowModal(false);
        fetchStaff();
      } else {
        showToast(data.message || 'Lỗi xử lý yêu cầu.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    }
  };

  const handleResetFiltersAndRefresh = () => {
    setSearchTerm('');
    setFilterRole('all');
    setFilterStatus('all');
    setCurrentPage(1);
    setSelectedIds([]);
    fetchStaff();
    showToast('Đã làm mới dữ liệu và dọn dẹp bộ lọc!');
  };

  // Metrics calculations
  const totalCount = staffList.length;
  const activeCount = staffList.filter(s => s.status === 'active').length;
  const activePct = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 100;

  const execCount = staffList.filter(s => ['general_manager', 'ops_manager', 'fleet_manager'].includes(s.role)).length;
  const opsCount = staffList.filter(s => ['driver', 'attendant', 'ticket_agent'].includes(s.role)).length;

  // Filter staff list
  const filteredStaff = staffList.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.phone.includes(searchTerm) ||
                          (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = filterRole === 'all' || s.role === filterRole;
    const matchesStatus = filterStatus === 'all' || s.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredStaff.length / pageSize) || 1;
  const paginatedStaff = filteredStaff.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getPageNumbers = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = [];
    pages.push(1);
    if (currentPage > 3) pages.push('...');
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages;
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(paginatedStaff.map(s => s._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(item => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const getAvatarBg = (role, index) => {
    const colors = ['#2563eb', '#7e22ce', '#0284c7', '#16a34a', '#0d9488', '#d97706', '#be185d'];
    return colors[index % colors.length];
  };

  const getSubTitleText = (staff, index) => {
    switch (staff.role) {
      case 'general_manager': return 'C-Level Executive';
      case 'admin': return 'SuperAdmin Dev';
      case 'ops_manager': return `Mã NV: NV-AB-010${index + 1}`;
      case 'fleet_manager': return `Mã NV: NV-AB-010${index + 2}`;
      case 'ticket_agent': return 'Quầy vé Miền Đông';
      case 'driver': return 'Tuyến TP.HCM - Đà Lạt';
      case 'attendant': return 'Tuyến TP.HCM - Cần Thơ';
      default: return `Mã NV: NV-AB-010${index + 1}`;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', width: '100%' }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', top: '65px', right: '20px', zIndex: 9999,
          background: toast.type === 'error' ? '#ef4444' : '#10b981',
          color: 'white', padding: '8px 16px', borderRadius: '8px',
          fontWeight: '600', fontSize: '0.8rem', boxShadow: '0 4px 14px rgba(0,0,0,0.12)'
        }}>
          {toast.msg}
        </div>
      )}

      {/* Main Top White Card Container wrapping Header & 4 Stat Cards */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '1.25rem 1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem'
      }}>
        {/* Top Header & Main Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Quản lý tài khoản &amp; Phân quyền RBAC
              </h1>
              <span style={{
                fontSize: '0.65rem', background: '#dbeafe', color: '#1d4ed8',
                padding: '2px 8px', borderRadius: '12px', fontWeight: '600'
              }}>
                Enterprise v2.4
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '2px', margin: 0 }}>
              Quản trị toàn bộ danh sách {totalCount} tài khoản trong hệ thống nhà xe An Bình Lines &amp; áp dụng ma trận quyền hạn chi tiết.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button 
              className="btn" 
              onClick={() => alert('Tính năng nhập danh sách từ file Excel đang sẵn sàng.')}
              style={{
                background: '#ffffff', border: '1px solid #e2e8f0', color: '#334155',
                fontWeight: '600', padding: '0.45rem 0.85rem', borderRadius: '8px',
                display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
              Nhập danh sách
            </button>
            <button 
              className="btn" 
              onClick={() => exportStaffToExcel(staffList)}
              style={{
                background: '#ffffff', border: '1px solid #e2e8f0', color: '#334155',
                fontWeight: '600', padding: '0.45rem 0.85rem', borderRadius: '8px',
                display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h6"/></svg>
              Xuất Excel
            </button>
            <button 
              onClick={handleOpenAdd} 
              className="btn" 
              style={{
                background: '#2563eb', border: 'none', color: '#ffffff',
                fontWeight: '600', padding: '0.45rem 0.95rem', borderRadius: '8px',
                display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Tạo tài khoản mới
            </button>
          </div>
        </div>

        {/* 4 Stat Cards Grid Matching Mockup */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.85rem' }}>
          {/* Card 1 */}
          <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                TỔNG TÀI KHOẢN
              </span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0f172a', marginBottom: '2px', lineHeight: '1.2' }}>
              {totalCount} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>user</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span>✓</span> {activePct}% Hoạt động bình thường
            </div>
          </div>

          {/* Card 2 */}
          <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                BAN ĐIỀU HÀNH &amp; QL
              </span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#faf5ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0f172a', marginBottom: '2px', lineHeight: '1.2' }}>
              {execCount} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>nhân sự</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
              Giám đốc, QL Vận tải, QL Đội
            </div>
          </div>

          {/* Card 3 */}
          <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                ĐỘI NGŨ VẬN HÀNH
              </span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2"><path d="M16 3h5v5"/><path d="M4 20L21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/></svg>
              </div>
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0f172a', marginBottom: '2px', lineHeight: '1.2' }}>
              {opsCount} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>nhân sự</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
              Tài xế xe khách &amp; Phụ tá
            </div>
          </div>

          {/* Card 4 */}
          <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                VAI TRÒ RBAC
              </span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
              </div>
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0f172a', marginBottom: '2px', lineHeight: '1.2' }}>
              7 <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>nhóm vai trò</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
              Quy chuẩn ISO-Vận tải
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div style={{
        background: '#ffffff', padding: '0.55rem 0.85rem', borderRadius: '12px',
        border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap'
      }}>
        <div style={{ position: 'relative', flex: 2, minWidth: '200px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Tìm theo Họ tên, SĐT, Email..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            style={{
              width: '100%', padding: '0.4rem 0.85rem 0.4rem 2.1rem', borderRadius: '8px',
              border: '1px solid #e2e8f0', background: '#ffffff', fontSize: '0.78rem', outline: 'none'
            }}
          />
        </div>

        <div style={{ flex: 1, minWidth: '140px' }}>
          <select 
            value={filterRole} 
            onChange={(e) => { setFilterRole(e.target.value); setCurrentPage(1); }}
            style={{
              width: '100%', padding: '0.4rem 0.75rem', borderRadius: '8px',
              border: '1px solid #e2e8f0', background: '#ffffff', fontSize: '0.78rem', color: '#334155', outline: 'none'
            }}
          >
            <option value="all">Tất cả vai trò</option>
            <option value="admin">Quản trị viên</option>
            <option value="general_manager">Ban Giám đốc</option>
            <option value="ops_manager">Quản lý Vận tải</option>
            <option value="fleet_manager">Quản lý Xe</option>
            <option value="ticket_manager">Quản lý phòng vé</option>
            <option value="ticket_agent">Nhân viên bán vé</option>
            <option value="driver">Tài xế</option>
            <option value="attendant">Phụ xe</option>
          </select>
        </div>

        <div style={{ flex: 1, minWidth: '140px' }}>
          <select 
            value={filterStatus} 
            onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            style={{
              width: '100%', padding: '0.4rem 0.75rem', borderRadius: '8px',
              border: '1px solid #e2e8f0', background: '#ffffff', fontSize: '0.78rem', color: '#334155', outline: 'none'
            }}
          >
            <option value="all">Hoạt động</option>
            <option value="active">Hoạt động</option>
            <option value="inactive">Tạm ngưng</option>
            <option value="suspended">Tạm khóa</option>
          </select>
        </div>

        <button 
          onClick={handleResetFiltersAndRefresh}
          style={{
            background: '#ffffff', border: '1px solid #e2e8f0', padding: '0.4rem 0.65rem',
            borderRadius: '8px', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center'
          }}
          title="Làm mới dữ liệu & Đặt lại bộ lọc"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
        </button>
      </div>

      {/* Bulk Selection Bar */}
      {selectedIds.length > 0 && (() => {
        const selectedStaffList = staffList.filter(s => selectedIds.includes(s._id));
        const canLockCount = selectedStaffList.filter(s => s.status !== 'suspended').length;
        const canUnlockCount = selectedStaffList.filter(s => s.status === 'suspended').length;

        return (
          <div style={{
            background: '#eff6ff', border: '1px solid #bfdbfe', padding: '0.45rem 0.85rem',
            borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            color: '#1e40af', fontSize: '0.78rem', fontWeight: '600', flexWrap: 'wrap', gap: '6px'
          }}>
            <div>
              Đã tích chọn <strong>{selectedIds.length}</strong> tài khoản
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              {canLockCount > 0 && (
                <button
                  onClick={() => handleBulkToggleStatus('suspended')}
                  style={{
                    background: '#fff7ed', border: '1px solid #fdba74', color: '#c2410c',
                    padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', cursor: 'pointer', fontWeight: '600'
                  }}
                >
                  Khóa ({canLockCount})
                </button>
              )}
              {canUnlockCount > 0 && (
                <button
                  onClick={() => handleBulkToggleStatus('active')}
                  style={{
                    background: '#f0fdf4', border: '1px solid #86efac', color: '#15803d',
                    padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', cursor: 'pointer', fontWeight: '600'
                  }}
                >
                  Mở khóa ({canUnlockCount})
                </button>
              )}
              <button
                onClick={handleBulkDelete}
                style={{
                  background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c',
                  padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', cursor: 'pointer', fontWeight: '600'
                }}
              >
                Xóa ({selectedIds.length})
              </button>
              <button
                onClick={() => exportStaffToExcel(selectedStaffList)}
                style={{
                  background: '#ffffff', border: '1px solid #93c5fd', color: '#1d4ed8',
                  padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', cursor: 'pointer', fontWeight: '600'
                }}
              >
                Export Excel ({selectedIds.length})
              </button>
              <button
                onClick={() => setSelectedIds([])}
                style={{
                  background: 'none', border: 'none', color: '#64748b',
                  fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline', marginLeft: '4px'
                }}
              >
                Bỏ chọn
              </button>
            </div>
          </div>
        );
      })()}

      {/* Main Table Panel */}
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.78rem' }}>
            Đang tải danh sách tài khoản người dùng...
          </div>
        ) : paginatedStaff.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.78rem' }}>
            Không tìm thấy tài khoản người dùng nào phù hợp.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '0.65rem 0.85rem', width: '30px' }}>
                    <input 
                      type="checkbox" 
                      onChange={handleSelectAll}
                      checked={paginatedStaff.length > 0 && paginatedStaff.every(s => selectedIds.includes(s._id))}
                    />
                  </th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>HỌ VÀ TÊN</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>SỐ ĐIỆN THOẠI / ĐĂNG NHẬP</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>EMAIL</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>VAI TRÒ RBAC</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>CHI NHÁNH / VĂN PHÒNG</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>TRẠNG THÁI</th>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {paginatedStaff.map((staff, idx) => {
                  const badgeStyle = ROLE_BADGE_STYLES[staff.role] || { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' };
                  const avatarColor = getAvatarBg(staff.role, idx);
                  const subTitle = getSubTitleText(staff, idx);

                  return (
                    <tr key={staff._id} style={{ borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle', fontSize: '0.78rem' }}>
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedIds.includes(staff._id)}
                          onChange={() => handleSelectOne(staff._id)}
                        />
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '26px', height: '26px', borderRadius: '50%',
                            backgroundColor: avatarColor, color: '#ffffff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: '800', fontSize: '0.75rem', flexShrink: 0
                          }}>
                            {staff.name ? staff.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
                            <span style={{ fontWeight: '700', color: '#0f172a' }}>{staff.name}</span>
                            <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{subTitle}</span>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', fontWeight: '700', color: '#334155' }}>
                        {staff.phone}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', color: '#64748b' }}>
                        {staff.email || '—'}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: '12px', fontSize: '0.68rem', fontWeight: '600',
                          backgroundColor: badgeStyle.bg, color: badgeStyle.color, border: `1px solid ${badgeStyle.border}`,
                          display: 'inline-flex', alignItems: 'center', gap: '4px'
                        }}>
                          <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: badgeStyle.color }}></span>
                          {ROLE_LABELS[staff.role] || staff.role}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: '600', color: '#1e293b' }}>
                            {staff.branch?.branchName || 'Chi nhánh TP. Hồ Chí Minh'}
                          </span>
                          {staff.assignedOffice && (
                            <span style={{ fontSize: '0.68rem', color: '#0d9488', fontWeight: '500' }}>
                              📍 {staff.assignedOffice} {staff.shiftType ? (staff.shiftType === 'evening' ? '(Ca Chiều)' : '(Ca Sáng)') : ''}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: '12px', fontSize: '0.68rem', fontWeight: '700',
                          backgroundColor: staff.status === 'active' ? '#dcfce7' : '#fef3c7',
                          color: staff.status === 'active' ? '#15803d' : '#b45309',
                          display: 'inline-flex', alignItems: 'center', gap: '4px'
                        }}>
                          <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: staff.status === 'active' ? '#16a34a' : '#d97706' }}></span>
                          {STATUS_LABELS[staff.status] || staff.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', fontWeight: '600', fontSize: '0.72rem' }}>
                          <button
                            onClick={() => handleToggleStatus(staff)}
                            style={{ background: 'none', border: 'none', color: '#d97706', cursor: 'pointer', padding: 0 }}
                          >
                            {staff.status === 'active' ? 'Khóa' : 'Mở khóa'}
                          </button>
                          <button
                            onClick={() => handleOpenEdit(staff)}
                            style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: 0 }}
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => handleDelete(staff)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 0 }}
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

        {/* Pagination Bar */}
        <div style={{
          padding: '8px 14px', borderTop: '1px solid #e2e8f0', background: '#ffffff',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem',
          fontSize: '0.75rem', color: '#64748b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Hiển thị</span>
            <select 
              value={pageSize} 
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              style={{ padding: '2px 6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.75rem' }}
            >
              <option value={6}>6</option>
              <option value={8}>8</option>
              <option value={12}>12</option>
              <option value={20}>20</option>
            </select>
            <span>trong tổng số <strong>{filteredStaff.length}</strong> tài khoản</span>
          </div>

          <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              style={{
                padding: '3px 8px', border: '1px solid #cbd5e1', borderRadius: '4px',
                background: currentPage === 1 ? '#ffffff' : '#ffffff', color: currentPage === 1 ? '#94a3b8' : '#334155',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontWeight: '500', fontSize: '0.75rem'
              }}
            >
              Trước
            </button>

            {getPageNumbers().map((page, idx) => (
              page === '...' ? (
                <span key={`ellipsis-${idx}`} style={{ padding: '0 4px', color: '#94a3b8', fontSize: '0.75rem' }}>...</span>
              ) : (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  style={{
                    padding: '3px 8px', border: '1px solid #cbd5e1', borderRadius: '4px',
                    background: currentPage === page ? '#2563eb' : '#ffffff',
                    color: currentPage === page ? '#ffffff' : '#334155',
                    fontWeight: currentPage === page ? '700' : '500',
                    cursor: 'pointer', fontSize: '0.75rem'
                  }}
                >
                  {page}
                </button>
              )
            ))}

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              style={{
                padding: '3px 8px', border: '1px solid #cbd5e1', borderRadius: '4px',
                background: currentPage === totalPages ? '#ffffff' : '#ffffff', color: currentPage === totalPages ? '#94a3b8' : '#334155',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontWeight: '500', fontSize: '0.75rem'
              }}
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            width: '100%', maxWidth: '560px', background: '#ffffff',
            borderRadius: '18px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden', position: 'relative', border: '1px solid #e2e8f0'
          }}>
            {/* Gradient Line Top */}
            <div style={{ height: '4px', background: 'linear-gradient(90deg, #2563eb 0%, #7e22ce 100%)' }}></div>

            {/* Modal Content Wrapper */}
            <div style={{ padding: '1.5rem 1.75rem' }}>
              
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '12px',
                    background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <line x1="19" y1="8" x2="19" y2="14" />
                      <line x1="16" y1="11" x2="22" y2="11" />
                    </svg>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
                      {editingStaff ? 'Cập nhật tài khoản người dùng' : 'Tạo tài khoản người dùng mới'}
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px', margin: 0 }}>
                      {editingStaff ? 'Chỉnh sửa vai trò, thông tin hoặc cập nhật trạng thái hoạt động.' : 'Thêm nhân sự mới vào hệ thống điều hành xe An Bình Lines và phân bổ quyền RBAC.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer', padding: '4px', lineHeight: 1 }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                {/* Field 1: HỌ VÀ TÊN */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontWeight: '700', fontSize: '0.72rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                    HỌ VÀ TÊN <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ví dụ: Nguyễn Văn Hùng"
                      style={{
                        width: '100%', padding: '0.6rem 0.85rem 0.6rem 38px', borderRadius: '10px',
                        border: '1px solid #e2e8f0', background: '#ffffff', fontSize: '0.85rem', color: '#0f172a',
                        outline: 'none'
                      }}
                      required
                    />
                  </div>
                </div>

                {/* Field 2 & 3: SỐ ĐIỆN THOẠI & EMAIL */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: '700', fontSize: '0.72rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                      SỐ ĐIỆN THOẠI (ĐĂNG NHẬP) <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                      </div>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="0912 345 678"
                        style={{
                          width: '100%', padding: '0.6rem 0.85rem 0.6rem 38px', borderRadius: '10px',
                          border: '1px solid #e2e8f0', background: '#ffffff', fontSize: '0.85rem', color: '#0f172a',
                          outline: 'none'
                        }}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: '700', fontSize: '0.72rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                      EMAIL LIÊN HỆ <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="driver3@anbinhlines.vn"
                        style={{
                          width: '100%', padding: '0.6rem 0.85rem 0.6rem 38px', borderRadius: '10px',
                          border: '1px solid #e2e8f0', background: '#ffffff', fontSize: '0.85rem', color: '#0f172a',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Field 4: MẬT KHẨU KHỞI TẠO */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontWeight: '700', fontSize: '0.72rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                    {editingStaff ? 'MẬT KHẨU MỚI (ĐỂ TRỐNG NẾU GIỮ NGUYÊN)' : 'MẬT KHẨU KHỞI TẠO'} <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      style={{
                        width: '100%', padding: '0.6rem 38px 0.6rem 38px', borderRadius: '10px',
                        border: '1px solid #e2e8f0', background: '#ffffff', fontSize: '0.85rem', color: '#0f172a',
                        outline: 'none'
                      }}
                      required={!editingStaff}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center'
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                    </button>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '6px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                    <span>Mật khẩu tối thiểu 6 ký tự, gồm chữ và số. Nhân viên có thể đổi sau lần đầu đăng nhập.</span>
                  </div>
                </div>

                {/* Field 5 & 6: VAI TRÒ & TRẠNG THÁI */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: '700', fontSize: '0.72rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                      PHÂN QUYỀN VAI TRÒ (ROLE) <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
                      </div>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        style={{
                          width: '100%', padding: '0.6rem 0.85rem 0.6rem 38px', borderRadius: '10px',
                          border: '1px solid #e2e8f0', background: '#ffffff', fontSize: '0.85rem', color: '#0f172a',
                          outline: 'none', cursor: 'pointer'
                        }}
                      >
                        <option value="driver">Tài xế (Lái xe)</option>
                        <option value="attendant">Phụ xe (Phụ tá)</option>
                        <option value="ticket_agent">Nhân viên Bán vé quầy</option>
                        <option value="ticket_manager">Quản lý Phòng vé</option>
                        <option value="ops_manager">Quản lý Vận tải</option>
                        <option value="fleet_manager">Quản lý Xe</option>
                        <option value="general_manager">Ban Giám đốc</option>
                        <option value="admin">Quản trị viên hệ thống</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: '700', fontSize: '0.72rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                      TRẠNG THÁI TÀI KHOẢN <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: status === 'active' ? '#16a34a' : status === 'inactive' ? '#d97706' : '#ef4444' }}></span>
                      </div>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        style={{
                          width: '100%', padding: '0.6rem 0.85rem 0.6rem 30px', borderRadius: '10px',
                          border: '1px solid #e2e8f0', background: '#ffffff', fontSize: '0.85rem', color: '#0f172a',
                          outline: 'none', cursor: 'pointer'
                        }}
                      >
                        <option value="active">Hoạt động (Kích hoạt ngay)</option>
                        <option value="inactive">Tạm ngưng</option>
                        <option value="suspended">Tạm khóa</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Khối Cấu hình Chi nhánh / Văn phòng / Khung giờ cho Nhân sự phòng vé */}
                {['ticket_manager', 'ticket_agent'].includes(role) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1.1rem', background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    {/* 1. Chọn Chi nhánh Tỉnh / Thành phố */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#1e40af' }}>
                        Chi nhánh trực thuộc (Tỉnh / Thành phố) *
                      </label>
                      <select
                        value={branchId}
                        onChange={(e) => handleBranchChange(e.target.value)}
                        style={{
                          padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #bfdbfe',
                          fontSize: '0.82rem', fontWeight: '600', outline: 'none', background: '#eff6ff', color: '#1e3a8a'
                        }}
                      >
                        <option value="sg">Chi nhánh TP. Hồ Chí Minh</option>
                        <option value="dl">Chi nhánh Đà Lạt</option>
                        <option value="ct">Chi nhánh Cần Thơ</option>
                      </select>
                    </div>

                    {/* 2. Chọn Văn phòng làm việc cụ thể */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#1e40af' }}>
                        Văn phòng phòng vé làm việc cụ thể *
                      </label>
                      <select
                        value={assignedOffice}
                        onChange={(e) => setAssignedOffice(e.target.value)}
                        style={{
                          padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1',
                          fontSize: '0.82rem', fontWeight: '600', outline: 'none', background: '#ffffff', color: '#0f172a'
                        }}
                      >
                        {(PROVINCE_OFFICES[branchId]?.offices || []).map(off => (
                          <option key={off.id} value={off.name}>{off.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* 3. Nếu là Nhân viên bán vé: Chọn Khung giờ làm việc */}
                    {role === 'ticket_agent' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#047857' }}>
                          Khung giờ làm việc *
                        </label>
                        <select
                          value={shiftType}
                          onChange={(e) => setShiftType(e.target.value)}
                          style={{
                            padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #a7f3d0',
                            fontSize: '0.82rem', fontWeight: '600', outline: 'none', background: '#ecfdf5', color: '#065f46'
                          }}
                        >
                          <option value="morning">Ca Sáng (06:30 - 14:30)</option>
                          <option value="evening">Ca Chiều - Tối (14:00 - 22:00)</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* Footer Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    style={{
                      padding: '0.55rem 1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0',
                      background: '#ffffff', color: '#475569', fontWeight: '600', fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '0.55rem 1.35rem', borderRadius: '10px', border: 'none',
                      background: '#2563eb', color: '#ffffff', fontWeight: '700', fontSize: '0.82rem',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                      boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    {editingStaff ? 'Lưu thay đổi' : 'Tạo tài khoản'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Action Modal */}
      {confirmModal.show && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '440px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '12px', color: '#0f172a' }}>{confirmModal.title}</h3>
            <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '20px' }}>{confirmModal.message}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn" onClick={() => setConfirmModal({ ...confirmModal, show: false })} style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}>
                Hủy
              </button>
              <button className="btn" onClick={() => { confirmModal.onConfirm(); setConfirmModal({ ...confirmModal, show: false }); }} style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', background: '#dc2626', color: '#ffffff', fontWeight: '600', cursor: 'pointer' }}>
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;
