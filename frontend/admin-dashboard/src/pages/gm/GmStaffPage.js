import React, { useState, useEffect, useContext } from 'react';
import API_BASE_URL from '../../config/api';
import { AuthContext } from '../../context/AuthContext';
import { BRANCHES, getBranchById } from '../../constants/branches';

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

const API_BASE = API_BASE_URL;

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
  csvContent += 'STT,Họ và tên,Số điện thoại / Đăng nhập,Email,Vai trò RBAC,Chi nhánh,Trạng thái\n';

  staffList.forEach((s, idx) => {
    const nameClean = `"${(s.name || '').replace(/"/g, '""')}"`;
    const phoneClean = `"${(s.phone || '').replace(/"/g, '""')}"`;
    const emailClean = `"${(s.email || '').replace(/"/g, '""')}"`;
    const roleClean = `"${(ROLE_LABELS[s.role] || s.role || '').replace(/"/g, '""')}"`;
    const branchClean = `"${(s.branch?.branchName || 'Toàn hệ thống').replace(/"/g, '""')}"`;
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

const GmStaffPage = () => {
  const { token } = useContext(AuthContext);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [resettingPw, setResettingPw] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null });
  const [selectedIds, setSelectedIds] = useState([]);

  // Pagination states (10 items per page by default)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterBranch, setFilterBranch] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('admin');
  const [branchId, setBranchId] = useState('sg');
  const [assignedOffice, setAssignedOffice] = useState('Văn phòng Bến xe Miền Đông');
  const [shiftType, setShiftType] = useState('morning'); // 'morning' | 'evening'
  const [status, setStatus] = useState('active');

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
    setPassword('Anbinh@2026');
    setRole('ticket_agent');
    setBranchId('sg');
    setAssignedOffice('Văn phòng Bến xe Miền Đông');
    setShiftType('morning');
    setStatus('active');
    setShowModal(true);
  };

  const handleResetToDefaultPassword = async () => {
    if (!editingStaff) return;
    const confirmMsg = `Bạn có chắc chắn muốn đặt lại mật khẩu của nhân viên "${editingStaff.name}" về mật khẩu mặc định "Anbinh@2026"?\nNhân viên sẽ dùng mật khẩu này để đăng nhập lại hệ thống.`;
    if (!window.confirm(confirmMsg)) return;

    setResettingPw(true);
    try {
      const res = await fetch(`${API_BASE}/users/staff/${editingStaff._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password: 'Anbinh@2026' })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Đã đặt lại mật khẩu thành công về "Anbinh@2026"!');
        setPassword('');
      } else {
        showToast(data.message || 'Không thể đặt lại mật khẩu.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ khi đặt lại mật khẩu.', 'error');
    } finally {
      setResettingPw(false);
    }
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Vui lòng nhập họ và tên nhân viên.', 'error');
      return;
    }

    const cleanPhone = phone.trim();
    if (!cleanPhone || !/^(0[35789])[0-9]{8}$/.test(cleanPhone)) {
      showToast('Số điện thoại không hợp lệ (phải gồm 10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09).', 'error');
      return;
    }

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      showToast('Vui lòng nhập địa chỉ email liên hệ.', 'error');
      return;
    }
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(cleanEmail)) {
      showToast('Định dạng email không hợp lệ (ví dụ: taixe.anbinh@gmail.com).', 'error');
      return;
    }

    if (!editingStaff && (!password.trim() || password.trim().length < 6)) {
      showToast('Mật khẩu khởi tạo phải có ít nhất 6 ký tự.', 'error');
      return;
    }

    const payload = {
      name: name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
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
    setFilterBranch('all');
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

  const execCount = staffList.filter(s => ['admin', 'general_manager', 'ops_manager', 'fleet_manager'].includes(s.role)).length;
  const opsCount = staffList.filter(s => ['driver', 'attendant', 'ticket_agent'].includes(s.role)).length;
  const roleTypesCount = new Set(staffList.map(s => s.role)).size || 7;

  // Filter staff list
  const filteredStaff = staffList.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.phone.includes(searchTerm) ||
                          (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = filterRole === 'all' || s.role === filterRole;
    const matchesBranch = filterBranch === 'all' || s.branch?.branchId === filterBranch;
    const matchesStatus = filterStatus === 'all' || s.status === filterStatus;
    return matchesSearch && matchesRole && matchesBranch && matchesStatus;
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', width: '100%' }}>
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

      {/* Main Top White Card Container */}
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

        {/* 4 Stat Cards Grid */}
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
              Admin, Giám đốc, QL Vận tải, QL Đội
            </div>
          </div>

          {/* Card 3 */}
          <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                ĐỘI NGŨ VẬN HÀNH
              </span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><path d="M21 2l-2 2m-2-2l2 2M3 7h18M3 12h18M3 17h18"/></svg>
              </div>
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0f172a', marginBottom: '2px', lineHeight: '1.2' }}>
              {roleTypesCount} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>nhóm vai trò</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
              Quy chuẩn ISO-Vận tải
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Panel */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '1.25rem 1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        {/* Search & Filter Toolbar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          background: '#f8fafc',
          padding: '0.75rem 1rem',
          borderRadius: '12px',
          border: '1px solid #e2e8f0'
        }}>
          {/* Left Inputs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1 }}>
            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: '260px', flex: 1 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                placeholder="Tìm theo Họ tên, SĐT, Email..."
                style={{
                  width: '100%', padding: '0.45rem 0.75rem 0.45rem 2rem', fontSize: '0.78rem',
                  borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', outline: 'none'
                }}
              />
            </div>

            {/* Role Filter */}
            <select
              value={filterRole}
              onChange={(e) => { setFilterRole(e.target.value); setCurrentPage(1); }}
              style={{
                padding: '0.45rem 0.75rem', fontSize: '0.78rem', borderRadius: '8px',
                border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontWeight: '500', outline: 'none'
              }}
            >
              <option value="all">Tất cả vai trò</option>
              <option value="admin">Quản trị viên (Admin)</option>
              <option value="general_manager">Ban Giám đốc (GM)</option>
              <option value="ops_manager">Quản lý Vận tải</option>
              <option value="fleet_manager">Quản lý Xe</option>
              <option value="ticket_manager">Quản lý phòng vé</option>
              <option value="ticket_agent">Nhân viên bán vé</option>
              <option value="driver">Tài xế</option>
              <option value="attendant">Phụ xe</option>
            </select>

            {/* Branch Filter */}
            <select
              value={filterBranch}
              onChange={(e) => { setFilterBranch(e.target.value); setCurrentPage(1); }}
              style={{
                padding: '0.45rem 0.75rem', fontSize: '0.78rem', borderRadius: '8px',
                border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontWeight: '500', outline: 'none'
              }}
            >
              <option value="all">Tất cả chi nhánh</option>
              <option value="sg">Chi nhánh TP. Hồ Chí Minh</option>
              <option value="dl">Chi nhánh Đà Lạt</option>
              <option value="ct">Chi nhánh Cần Thơ</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
              style={{
                padding: '0.45rem 0.75rem', fontSize: '0.78rem', borderRadius: '8px',
                border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontWeight: '500', outline: 'none'
              }}
            >
              <option value="all">Hoạt động &amp; Khóa</option>
              <option value="active">Hoạt động</option>
              <option value="suspended">Tạm khóa</option>
            </select>
          </div>

          {/* Right Refresh Action */}
          <button
            onClick={handleResetFiltersAndRefresh}
            title="Làm mới bộ lọc &amp; Tải lại CSDL"
            style={{
              padding: '0.45rem 0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1',
              background: '#ffffff', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
          </button>
        </div>

        {/* Table Content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#2563eb', fontWeight: '600', fontSize: '0.85rem' }}>
            Đang tải dữ liệu tài khoản từ CSDL...
          </div>
        ) : filteredStaff.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b', fontSize: '0.85rem' }}>
            Không tìm thấy tài khoản người dùng nào khớp với bộ lọc.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '0.65rem 0.85rem', width: '40px' }}>
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={paginatedStaff.length > 0 && selectedIds.length === paginatedStaff.length}
                    />
                  </th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>HỌ VÀ TÊN</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>SỐ ĐIỆN THOẠI / ĐĂNG NHẬP</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>EMAIL</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>VAI TRÒ RBAC</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>CHI NHÁNH</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>TRẠNG THÁI</th>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {paginatedStaff.map((staff, index) => {
                  const isChecked = selectedIds.includes(staff._id);
                  const roleStyle = ROLE_BADGE_STYLES[staff.role] || { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
                  const initial = (staff.name || 'U').charAt(0).toUpperCase();

                  return (
                    <tr
                      key={staff._id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: isChecked ? '#eff6ff' : 'transparent',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleSelectOne(staff._id)}
                        />
                      </td>

                      {/* Name & Avatar Column */}
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            background: getAvatarBg(staff.role, index),
                            color: '#ffffff', fontWeight: '800', fontSize: '0.8rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            {initial}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: '700', color: '#0f172a' }}>{staff.name}</span>
                          </div>
                        </div>
                      </td>

                      {/* Phone / Login Account */}
                      <td style={{ padding: '0.65rem 0.85rem', fontFamily: 'monospace', fontWeight: '600', color: '#334155' }}>
                        {staff.phone}
                      </td>

                      {/* Email */}
                      <td style={{ padding: '0.65rem 0.85rem', color: '#64748b' }}>
                        {staff.email || 'N/A'}
                      </td>

                      {/* Role Pill Badge */}
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <span style={{
                          padding: '3px 9px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: '700',
                          backgroundColor: roleStyle.bg, color: roleStyle.color, border: `1px solid ${roleStyle.border}`,
                          display: 'inline-flex', alignItems: 'center', gap: '4px'
                        }}>
                          • {ROLE_LABELS[staff.role] || staff.role}
                        </span>
                      </td>

                      {/* Branch Badge */}
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        {staff.branch?.branchName ? (
                          <span style={{
                            fontSize: '0.72rem', fontWeight: '600', color: '#1e40af',
                            background: '#eff6ff', padding: '2px 8px', borderRadius: '4px',
                            border: '1px solid #bfdbfe'
                          }}>
                            {staff.branch.branchName}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Toàn hệ thống</span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <span style={{
                          padding: '3px 9px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: '700',
                          backgroundColor: staff.status === 'active' ? '#dcfce7' : '#fee2e2',
                          color: staff.status === 'active' ? '#15803d' : '#b91c1c',
                          display: 'inline-flex', alignItems: 'center', gap: '4px'
                        }}>
                          • {STATUS_LABELS[staff.status] || staff.status}
                        </span>
                      </td>

                      {/* Action Links */}
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', fontSize: '0.75rem', fontWeight: '600' }}>
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
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}
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

        {/* Footer Pagination & Info */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem',
          paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', fontSize: '0.75rem', color: '#64748b'
        }}>
          <div>
            Hiển thị <strong>{((currentPage - 1) * pageSize) + 1}</strong> - <strong>{Math.min(currentPage * pageSize, filteredStaff.length)}</strong> trên tổng số <strong>{filteredStaff.length}</strong> tài khoản
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              style={{
                padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1',
                background: currentPage === 1 ? '#f8fafc' : '#ffffff',
                color: currentPage === 1 ? '#94a3b8' : '#0f172a', fontWeight: '600', cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              Trước
            </button>
            <span style={{ fontWeight: '700', color: '#0f172a' }}>Trang {currentPage} / {totalPages}</span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              style={{
                padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1',
                background: currentPage >= totalPages ? '#f8fafc' : '#ffffff',
                color: currentPage >= totalPages ? '#94a3b8' : '#0f172a', fontWeight: '600', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Modal Without Emojis */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(2px)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0',
            width: '100%', maxWidth: '520px', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
                {editingStaff ? 'Cập nhật tài khoản người dùng' : 'Thêm tài khoản nhân sự / Quản trị viên mới'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#334155' }}>Họ và tên *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nhập họ tên đầy đủ"
                  required
                  style={{
                    padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1',
                    fontSize: '0.8rem', outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#334155' }}>Số điện thoại *</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Nhập SĐT đăng nhập"
                    required
                    style={{
                      padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1',
                      fontSize: '0.8rem', outline: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#334155' }}>
                    Email liên hệ <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Nhập email tài khoản"
                    style={{
                      padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1',
                      fontSize: '0.8rem', outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#334155' }}>
                  Mật khẩu tài khoản
                </label>
                {editingStaff ? (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: '#f8fafc',
                    border: '1px dashed #cbd5e1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#334155' }}>
                        Mật khẩu mặc định hệ thống
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                        Cấp lại mật khẩu chuẩn: <strong style={{ color: '#2563eb' }}>Anbinh@2026</strong>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetToDefaultPassword}
                      disabled={resettingPw}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        border: '1px solid #bfdbfe',
                        backgroundColor: '#eff6ff',
                        color: '#1d4ed8',
                        fontWeight: '700',
                        fontSize: '0.75rem',
                        cursor: resettingPw ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {resettingPw ? 'Đang đặt lại...' : 'Reset về Anbinh@2026'}
                    </button>
                  </div>
                ) : (
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mật khẩu khởi tạo (mặc định: Anbinh@2026)"
                    style={{
                      padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1',
                      fontSize: '0.8rem', outline: 'none'
                    }}
                  />
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#334155' }}>Vai trò / Phân quyền *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    style={{
                      padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1',
                      fontSize: '0.8rem', fontWeight: '600', outline: 'none', background: '#ffffff'
                    }}
                  >
                    <option value="admin">Quản trị viên (Admin)</option>
                    <option value="general_manager">Ban Giám đốc (GM)</option>
                    <option value="ops_manager">Quản lý Vận tải</option>
                    <option value="fleet_manager">Quản lý Xe</option>
                    <option value="ticket_manager">Quản lý phòng vé</option>
                    <option value="ticket_agent">Nhân viên bán vé</option>
                    <option value="driver">Tài xế</option>
                    <option value="attendant">Phụ xe</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#334155' }}>Trạng thái *</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    style={{
                      padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1',
                      fontSize: '0.8rem', fontWeight: '600', outline: 'none', background: '#ffffff'
                    }}
                  >
                    <option value="active">Hoạt động</option>
                    <option value="inactive">Tạm ngưng</option>
                    <option value="suspended">Tạm khóa</option>
                  </select>
                </div>
              </div>

              {['ticket_manager', 'ticket_agent'].includes(role) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '0.85rem' }}>
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
                        fontSize: '0.8rem', fontWeight: '600', outline: 'none', background: '#eff6ff', color: '#1e3a8a'
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
                      Văn phòng làm việc cụ thể *
                    </label>
                    <select
                      value={assignedOffice}
                      onChange={(e) => setAssignedOffice(e.target.value)}
                      style={{
                        padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1',
                        fontSize: '0.8rem', fontWeight: '600', outline: 'none', background: '#ffffff', color: '#0f172a'
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
                          fontSize: '0.8rem', fontWeight: '600', outline: 'none', background: '#ecfdf5', color: '#065f46'
                        }}
                      >
                        <option value="morning">Ca Sáng (06:30 - 14:30)</option>
                        <option value="evening">Ca Chiều - Tối (14:00 - 22:00)</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1',
                    background: '#ffffff', color: '#475569', fontWeight: '600', fontSize: '0.8rem', cursor: 'pointer'
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none',
                    background: '#2563eb', color: '#ffffff', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
                  }}
                >
                  {editingStaff ? 'Lưu thay đổi' : 'Tạo tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(2px)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0',
            width: '100%', maxWidth: '420px', padding: '1.25rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>
              {confirmModal.title}
            </h4>
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.8rem', color: '#64748b' }}>
              {confirmModal.message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setConfirmModal({ ...confirmModal, show: false })}
                style={{
                  padding: '0.45rem 0.95rem', borderRadius: '8px', border: '1px solid #cbd5e1',
                  background: '#ffffff', color: '#475569', fontWeight: '600', fontSize: '0.78rem', cursor: 'pointer'
                }}
              >
                Hủy
              </button>
              <button
                onClick={() => { confirmModal.onConfirm(); setConfirmModal({ ...confirmModal, show: false }); }}
                style={{
                  padding: '0.45rem 0.95rem', borderRadius: '8px', border: 'none',
                  background: '#ef4444', color: '#ffffff', fontWeight: '700', fontSize: '0.78rem', cursor: 'pointer'
                }}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GmStaffPage;
