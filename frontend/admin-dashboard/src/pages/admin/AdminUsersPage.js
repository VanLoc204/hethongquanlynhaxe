import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const API_BASE = 'http://localhost:8000/api/v1';

const ROLE_LABELS = {
  driver: 'Tài xế',
  attendant: 'Phụ xe',
  ticket_agent: 'Nhân viên bán vé',
  fleet_manager: 'Quản lý Đội xe',
  ops_manager: 'Quản lý Vận tải',
  general_manager: 'Ban Giám đốc',
  admin: 'Quản trị viên'
};

const ROLE_BADGE_STYLES = {
  admin: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  general_manager: { bg: '#f3e8ff', color: '#7e22ce', border: '#e9d5ff' },
  ops_manager: { bg: '#e0f2fe', color: '#0284c7', border: '#bae6fd' },
  fleet_manager: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  ticket_agent: { bg: '#ccfbf1', color: '#0d9488', border: '#99f6e4' },
  driver: { bg: '#dcfce7', color: '#16a34a', border: '#bbf7d0' },
  attendant: { bg: '#fce7f3', color: '#be185d', border: '#fbcfe8' }
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
  csvContent += 'STT,Họ và tên,Số điện thoại / Đăng nhập,Email,Vai trò RBAC,Trạng thái\n';

  staffList.forEach((s, idx) => {
    const nameClean = `"${(s.name || '').replace(/"/g, '""')}"`;
    const phoneClean = `"${(s.phone || '').replace(/"/g, '""')}"`;
    const emailClean = `"${(s.email || '').replace(/"/g, '""')}"`;
    const roleClean = `"${(ROLE_LABELS[s.role] || s.role || '').replace(/"/g, '""')}"`;
    const statusClean = `"${(STATUS_LABELS[s.status] || s.status || '').replace(/"/g, '""')}"`;

    csvContent += `${idx + 1},${nameClean},${phoneClean},${emailClean},${roleClean},${statusClean}\n`;
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
  const [role, setRole] = useState('driver');
  const [status, setStatus] = useState('active');

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
    setRole('driver');
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {/* Toast Notification */}
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

      {/* Top Header & Main Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.65rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Quản lý tài khoản &amp; Phân quyền RBAC
            </h1>
            <span style={{
              fontSize: '0.75rem', background: '#dbeafe', color: '#1d4ed8',
              padding: '3px 10px', borderRadius: '12px', fontWeight: '600'
            }}>
              Enterprise v2.4
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.88rem', marginTop: '4px' }}>
            Quản trị toàn bộ danh sách {totalCount} tài khoản trong hệ thống nhà xe An Bình Lines &amp; áp dụng ma trận quyền hạn chi tiết.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            className="btn" 
            onClick={() => alert('Tính năng nhập danh sách từ file Excel đang sẵn sàng.')}
            style={{
              background: '#ffffff', border: '1px solid #cbd5e1', color: '#334155',
              fontWeight: '600', padding: '0.55rem 1.1rem', borderRadius: '8px',
              display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
            Nhập danh sách
          </button>
          <button 
            className="btn" 
            onClick={() => exportStaffToExcel(staffList)}
            style={{
              background: '#ffffff', border: '1px solid #cbd5e1', color: '#334155',
              fontWeight: '600', padding: '0.55rem 1.1rem', borderRadius: '8px',
              display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            Xuất Excel
          </button>
          <button 
            onClick={handleOpenAdd} 
            className="btn" 
            style={{
              background: '#2563eb', border: 'none', color: '#ffffff',
              fontWeight: '600', padding: '0.55rem 1.25rem', borderRadius: '8px',
              display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Tạo tài khoản mới
          </button>
        </div>
      </div>

      {/* 4 Stat Cards Grid Matching Mockup */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1.25rem' }}>
        {/* Card 1 */}
        <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              TỔNG TÀI KHOẢN
            </span>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>
            {totalCount} <span style={{ fontSize: '1.1rem', fontWeight: '600', color: '#64748b' }}>user</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>✓</span> {activePct}% Hoạt động bình thường
          </div>
        </div>

        {/* Card 2 */}
        <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              BAN ĐIỀU HÀNH &amp; QL
            </span>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#faf5ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>
            {execCount} <span style={{ fontSize: '1.1rem', fontWeight: '600', color: '#64748b' }}>nhân sự</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Giám đốc, QL Vận tải, QL Đội
          </div>
        </div>

        {/* Card 3 */}
        <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ĐỘI NGŨ VẬN HÀNH
            </span>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2"><path d="M16 3h5v5"/><path d="M4 20L21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/></svg>
            </div>
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>
            {opsCount} <span style={{ fontSize: '1.1rem', fontWeight: '600', color: '#64748b' }}>nhân sự</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Tài xế xe khách &amp; Phụ tá
          </div>
        </div>

        {/* Card 4 */}
        <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              VAI TRÒ RBAC
            </span>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
            </div>
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>
            7 <span style={{ fontSize: '1.1rem', fontWeight: '600', color: '#64748b' }}>nhóm vai trò</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Quy chuẩn ISO-Vận tải
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div style={{
        background: '#ffffff', padding: '1rem', borderRadius: '12px',
        border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap'
      }}>
        <div style={{ position: 'relative', flex: 2, minWidth: '260px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Tìm theo Họ tên, SĐT, Email..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            style={{
              width: '100%', padding: '0.55rem 1rem 0.55rem 2.4rem', borderRadius: '8px',
              border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '0.88rem', outline: 'none'
            }}
          />
        </div>

        <div style={{ flex: 1, minWidth: '180px' }}>
          <select 
            value={filterRole} 
            onChange={(e) => { setFilterRole(e.target.value); setCurrentPage(1); }}
            style={{
              width: '100%', padding: '0.55rem 1rem', borderRadius: '8px',
              border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '0.88rem', color: '#334155', outline: 'none'
            }}
          >
            <option value="all">Tất cả vai trò</option>
            <option value="admin">Quản trị viên</option>
            <option value="general_manager">Ban Giám đốc</option>
            <option value="ops_manager">Quản lý Vận tải</option>
            <option value="fleet_manager">Quản lý Đội xe</option>
            <option value="ticket_agent">Nhân viên bán vé</option>
            <option value="driver">Tài xế</option>
            <option value="attendant">Phụ xe</option>
          </select>
        </div>

        <div style={{ flex: 1, minWidth: '180px' }}>
          <select 
            value={filterStatus} 
            onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            style={{
              width: '100%', padding: '0.55rem 1rem', borderRadius: '8px',
              border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '0.88rem', color: '#334155', outline: 'none'
            }}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Hoạt động</option>
            <option value="inactive">Tạm ngưng</option>
            <option value="suspended">Tạm khóa</option>
          </select>
        </div>

        <button 
          onClick={handleResetFiltersAndRefresh}
          style={{
            background: '#f8fafc', border: '1px solid #cbd5e1', padding: '0.55rem 0.9rem',
            borderRadius: '8px', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center'
          }}
          title="Làm mới dữ liệu & Đặt lại bộ lọc"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
        </button>
      </div>

      {/* Bulk Selection Bar */}
      {selectedIds.length > 0 && (() => {
        const selectedStaffList = staffList.filter(s => selectedIds.includes(s._id));
        const canLockCount = selectedStaffList.filter(s => s.status !== 'suspended').length;
        const canUnlockCount = selectedStaffList.filter(s => s.status === 'suspended').length;

        return (
          <div style={{
            background: '#eff6ff', border: '1px solid #bfdbfe', padding: '0.75rem 1.25rem',
            borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            color: '#1e40af', fontSize: '0.88rem', fontWeight: '600', flexWrap: 'wrap', gap: '10px'
          }}>
            <div>
              Đã tích chọn <strong>{selectedIds.length}</strong> tài khoản
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              {canLockCount > 0 && (
                <button
                  onClick={() => handleBulkToggleStatus('suspended')}
                  style={{
                    background: '#fff7ed', border: '1px solid #fdba74', color: '#c2410c',
                    padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.82rem', cursor: 'pointer', fontWeight: '600'
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
                    padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.82rem', cursor: 'pointer', fontWeight: '600'
                  }}
                >
                  Mở khóa ({canUnlockCount})
                </button>
              )}
              <button
                onClick={handleBulkDelete}
                style={{
                  background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c',
                  padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.82rem', cursor: 'pointer', fontWeight: '600'
                }}
              >
                Xóa ({selectedIds.length})
              </button>
              <button
                onClick={() => exportStaffToExcel(selectedStaffList)}
                style={{
                  background: '#ffffff', border: '1px solid #93c5fd', color: '#1d4ed8',
                  padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.82rem', cursor: 'pointer', fontWeight: '600'
                }}
              >
                Export Excel ({selectedIds.length})
              </button>
              <button
                onClick={() => setSelectedIds([])}
                style={{
                  background: 'none', border: 'none', color: '#64748b',
                  fontSize: '0.82rem', cursor: 'pointer', textDecoration: 'underline', marginLeft: '6px'
                }}
              >
                Bỏ chọn
              </button>
            </div>
          </div>
        );
      })()}

      {/* Main Table Panel */}
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
            Đang tải danh sách tài khoản người dùng...
          </div>
        ) : paginatedStaff.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
            Không tìm thấy tài khoản người dùng nào phù hợp.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '14px 16px', width: '40px' }}>
                    <input 
                      type="checkbox" 
                      onChange={handleSelectAll}
                      checked={paginatedStaff.length > 0 && paginatedStaff.every(s => selectedIds.includes(s._id))}
                    />
                  </th>
                  <th style={{ padding: '14px 16px' }}>HỌ VÀ TÊN</th>
                  <th style={{ padding: '14px 16px' }}>SỐ ĐIỆN THOẠI / ĐĂNG NHẬP</th>
                  <th style={{ padding: '14px 16px' }}>EMAIL</th>
                  <th style={{ padding: '14px 16px' }}>VAI TRÒ RBAC</th>
                  <th style={{ padding: '14px 16px' }}>TRẠNG THÁI</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {paginatedStaff.map((staff, idx) => {
                  const badgeStyle = ROLE_BADGE_STYLES[staff.role] || { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' };
                  const avatarColor = getAvatarBg(staff.role, idx);
                  const subTitle = getSubTitleText(staff, idx);

                  return (
                    <tr key={staff._id} style={{ borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle', fontSize: '0.88rem' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedIds.includes(staff._id)}
                          onChange={() => handleSelectOne(staff._id)}
                        />
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '36px', height: '36px', borderRadius: '50%',
                            backgroundColor: avatarColor, color: '#ffffff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: '800', fontSize: '0.9rem', flexShrink: 0
                          }}>
                            {staff.name ? staff.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: '700', color: '#0f172a' }}>{staff.name}</span>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>{subTitle}</span>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: '700', color: '#334155', fontFamily: 'monospace' }}>
                        {staff.phone}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#64748b' }}>
                        {staff.email || '—'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          padding: '4px 12px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '600',
                          backgroundColor: badgeStyle.bg, color: badgeStyle.color, border: `1px solid ${badgeStyle.border}`,
                          display: 'inline-flex', alignItems: 'center', gap: '6px'
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: badgeStyle.color }}></span>
                          {ROLE_LABELS[staff.role] || staff.role}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          padding: '4px 12px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '700',
                          backgroundColor: staff.status === 'active' ? '#dcfce7' : '#fef3c7',
                          color: staff.status === 'active' ? '#15803d' : '#b45309',
                          display: 'inline-flex', alignItems: 'center', gap: '6px'
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: staff.status === 'active' ? '#16a34a' : '#d97706' }}></span>
                          {STATUS_LABELS[staff.status] || staff.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', fontWeight: '600', fontSize: '0.82rem' }}>
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
          padding: '12px 16px', borderTop: '1px solid #e2e8f0', background: '#ffffff',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem',
          fontSize: '0.85rem', color: '#64748b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Hiển thị</span>
            <select 
              value={pageSize} 
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            >
              <option value={8}>8</option>
              <option value={12}>12</option>
              <option value={20}>20</option>
            </select>
            <span>trong tổng số <strong>{filteredStaff.length}</strong> tài khoản</span>
          </div>

          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              style={{
                padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '6px',
                background: currentPage === 1 ? '#f1f5f9' : '#ffffff', color: currentPage === 1 ? '#94a3b8' : '#334155',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontWeight: '500', fontSize: '0.82rem'
              }}
            >
              Trước
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                style={{
                  width: '32px', height: '32px', border: '1px solid', borderRadius: '6px',
                  borderColor: currentPage === page ? '#2563eb' : '#cbd5e1',
                  background: currentPage === page ? '#2563eb' : '#ffffff',
                  color: currentPage === page ? '#ffffff' : '#334155',
                  fontWeight: '700', cursor: 'pointer', fontSize: '0.82rem'
                }}
              >
                {page}
              </button>
            ))}
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              style={{
                padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '6px',
                background: currentPage === totalPages ? '#f1f5f9' : '#ffffff', color: currentPage === totalPages ? '#94a3b8' : '#334155',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontWeight: '500', fontSize: '0.82rem'
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
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="panel" style={{ width: '100%', maxWidth: '520px', padding: '24px', borderRadius: '12px', background: '#ffffff' }}>
            <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', fontWeight: '700', color: '#0f172a' }}>
              {editingStaff ? 'Cập nhật tài khoản người dùng' : 'Tạo tài khoản người dùng mới'}
            </h3>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontWeight: '600', fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>Họ và tên *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="Nhập họ tên đầy đủ"
                  style={{ width: '100%', padding: '0.55rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  required 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '600', fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>Số điện thoại (Đăng nhập) *</label>
                  <input 
                    type="tel" 
                    className="form-control" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    placeholder="09xxx..."
                    style={{ width: '100%', padding: '0.55rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '600', fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>Email liên hệ</label>
                  <input 
                    type="email" 
                    className="form-control" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="user@anbinhlines.vn"
                    style={{ width: '100%', padding: '0.55rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontWeight: '600', fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>
                  {editingStaff ? 'Mật khẩu mới (để trống nếu giữ nguyên)' : 'Mật khẩu *'}
                </label>
                <input 
                  type="password" 
                  className="form-control" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="Nhập mật khẩu"
                  style={{ width: '100%', padding: '0.55rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  required={!editingStaff} 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '600', fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>Phân quyền vai trò (Role) *</label>
                  <select 
                    className="form-control" 
                    value={role} 
                    onChange={(e) => setRole(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="driver">Tài xế</option>
                    <option value="attendant">Phụ xe</option>
                    <option value="ticket_agent">Nhân viên bán vé</option>
                    <option value="fleet_manager">Quản lý Đội xe</option>
                    <option value="ops_manager">Quản lý Vận tải</option>
                    <option value="general_manager">Ban Giám đốc</option>
                    <option value="admin">Quản trị viên</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '600', fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>Trạng thái tài khoản *</label>
                  <select 
                    className="form-control" 
                    value={status} 
                    onChange={(e) => setStatus(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="active">Hoạt động</option>
                    <option value="inactive">Tạm ngưng</option>
                    <option value="suspended">Tạm khóa</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn" style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}>
                  Hủy
                </button>
                <button type="submit" className="btn" style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#ffffff', fontWeight: '600', cursor: 'pointer' }}>
                  {editingStaff ? 'Lưu thay đổi' : 'Tạo tài khoản'}
                </button>
              </div>
            </form>
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
