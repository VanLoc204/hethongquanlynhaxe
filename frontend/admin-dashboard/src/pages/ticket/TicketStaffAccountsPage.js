import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { getBranchById, getBranchName, getOfficesByBranchId } from '../../constants/branches';

const API_BASE = 'http://localhost:8000/api';

const STATUS_CONFIG = {
  active: { label: 'Đang hoạt động', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
  inactive: { label: 'Tạm ngưng', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
  suspended: { label: 'Tạm khóa', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' }
};

const TicketStaffAccountsPage = () => {
  const { token, user } = useContext(AuthContext);

  const managerBranchId = user?.branch?.branchId || 'sg';
  const branchInfo = getBranchById(managerBranchId);
  const officesList = getOfficesByBranchId(managerBranchId) || [];

  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterFace, setFilterFace] = useState('all');

  // Account Modal (Add / Edit)
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formOffice, setFormOffice] = useState('');
  const [formShift, setFormShift] = useState('morning');
  const [formStatus, setFormStatus] = useState('active');
  const [savingAccount, setSavingAccount] = useState(false);
  const [resettingPw, setResettingPw] = useState(false);
  const [errors, setErrors] = useState({});

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const clearError = (field) => {
    if (errors[field]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const validateForm = () => {
    const errs = {};

    // 1. Kiểm tra Họ và tên
    const trimmedName = formName.trim();
    if (!trimmedName) {
      errs.name = 'Vui lòng nhập họ và tên nhân viên.';
    } else if (trimmedName.length < 3) {
      errs.name = 'Họ và tên nhân viên phải có ít nhất 3 ký tự.';
    } else if (/\d/.test(trimmedName)) {
      errs.name = 'Họ và tên không được chứa chữ số.';
    }

    // 2. Kiểm tra Số điện thoại
    const trimmedPhone = formPhone.trim();
    const phoneRegex = /^(0[3|5|7|8|9])[0-9]{8}$/;
    if (!trimmedPhone) {
      errs.phone = 'Vui lòng nhập số điện thoại đăng nhập.';
    } else if (!phoneRegex.test(trimmedPhone)) {
      errs.phone = 'Số điện thoại không hợp lệ (gồm 10 chữ số, đầu 03, 05, 07, 08, 09).';
    }

    // 3. Kiểm tra Email (Bắt buộc để nhận OTP xác thực)
    const trimmedEmail = formEmail.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail) {
      errs.email = 'Vui lòng nhập địa chỉ email (bắt buộc nhận mã OTP).';
    } else if (!emailRegex.test(trimmedEmail)) {
      errs.email = 'Định dạng email không hợp lệ (ví dụ: nhanvien@anbinhlines.vn).';
    }

    // 4. Kiểm tra Mật khẩu (Chỉ áp dụng khi tạo tài khoản mới)
    if (!editingAccount) {
      const trimmedPassword = formPassword.trim();
      if (!trimmedPassword) {
        errs.password = 'Vui lòng nhập mật khẩu khởi tạo (mặc định: Anbinh@2026).';
      } else if (trimmedPassword.length < 6) {
        errs.password = 'Mật khẩu phải có tối thiểu 6 ký tự.';
      }
    }

    // 5. Kiểm tra Văn phòng làm việc
    if (!formOffice.trim()) {
      errs.office = 'Vui lòng chọn văn phòng làm việc cụ thể.';
    }

    // 6. Kiểm tra Ca làm việc
    if (!formShift.trim()) {
      errs.shift = 'Vui lòng chọn khung giờ làm việc.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/staff`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        let agents = (data.staff || []).filter((s) => s.role === 'ticket_agent');
        const activeBranchId = user?.branch?.branchId || branchInfo?.branchId;
        if (user?.role === 'ticket_manager' && activeBranchId) {
          agents = agents.filter((s) => s.branch?.branchId === activeBranchId);
        }
        setStaffList(agents);
      } else {
        showToast(data.message || 'Không thể tải danh sách nhân viên.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ khi lấy danh sách nhân sự.', 'error');
    } finally {
      setLoading(false);
    }
  }, [token, user, branchInfo]);

  useEffect(() => {
    if (token) fetchStaff();
  }, [token, fetchStaff]);

  // Mở modal thêm mới
  const handleOpenCreateModal = () => {
    setEditingAccount(null);
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormPassword('Anbinh@2026');
    const defaultOffice = officesList[0]?.name || (branchInfo?.offices?.[0]?.name) || 'Văn phòng Bến xe Miền Đông';
    setFormOffice(defaultOffice);
    setFormShift('morning');
    setFormStatus('active');
    setErrors({});
    setShowAccountModal(true);
  };

  // Mở modal chỉnh sửa
  const handleOpenEditModal = (acc) => {
    setEditingAccount(acc);
    setFormName(acc.name || '');
    setFormPhone(acc.phone || '');
    setFormEmail(acc.email || '');
    setFormPassword('');
    const curOffice = acc.assignedOffice || (Array.isArray(acc.branch?.assignedOffices) ? acc.branch.assignedOffices[0] : null) || officesList[0]?.name || 'Văn phòng Bến xe Miền Đông';
    setFormOffice(curOffice);
    setFormShift(acc.shiftType || 'morning');
    setFormStatus(acc.status || 'active');
    setErrors({});
    setShowAccountModal(true);
  };

  // Đặt lại mật khẩu mặc định Anbinh@2026
  const handleResetToDefaultPassword = async () => {
    if (!editingAccount) return;
    const confirmMsg = `Bạn có chắc chắn muốn đặt lại mật khẩu của nhân viên "${editingAccount.name}" về mật khẩu mặc định "Anbinh@2026"?\nNhân viên sẽ dùng mật khẩu này để đăng nhập lại hệ thống.`;
    if (!window.confirm(confirmMsg)) {
      return;
    }

    setResettingPw(true);
    try {
      const res = await fetch(`${API_BASE}/users/staff/${editingAccount._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          password: 'Anbinh@2026',
          role: 'ticket_agent'
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Đã đặt lại mật khẩu về mặc định "Anbinh@2026" thành công!`);
      } else {
        showToast(data.message || 'Không thể đặt lại mật khẩu.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ khi đặt lại mật khẩu.', 'error');
    } finally {
      setResettingPw(false);
    }
  };

  // Lưu tài khoản (Thêm mới hoặc Cập nhật)
  const handleSaveAccount = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast('Vui lòng hoàn thiện đúng các trường dữ liệu bắt buộc.', 'error');
      return;
    }

    setSavingAccount(true);
    try {
      const shiftNameText = formShift === 'morning' ? 'Ca Sáng (06:30 - 14:30)' : 'Ca Chiều - Tối (14:00 - 22:00)';

      if (editingAccount) {
        const payload = {
          name: formName.trim(),
          phone: formPhone.trim(),
          email: formEmail.trim(),
          status: formStatus,
          role: 'ticket_agent',
          assignedOffice: formOffice,
          shiftType: formShift,
          shiftName: shiftNameText
        };

        const res = await fetch(`${API_BASE}/users/staff/${editingAccount._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          showToast('Cập nhật thông tin nhân viên bán vé thành công!');
          setShowAccountModal(false);
          fetchStaff();
        } else {
          showToast(data.message || 'Cập nhật tài khoản thất bại.', 'error');
        }
      } else {
        const payload = {
          name: formName.trim(),
          phone: formPhone.trim(),
          email: formEmail.trim(),
          password: formPassword.trim() || 'Anbinh@2026',
          role: 'ticket_agent',
          status: formStatus,
          assignedOffice: formOffice,
          shiftType: formShift,
          shiftName: shiftNameText,
          branch: user?.branch || (branchInfo ? {
            branchId: branchInfo.branchId,
            branchName: branchInfo.branchName,
            assignedOffices: (branchInfo.offices || []).map((o) => o.name)
          } : undefined)
        };

        const res = await fetch(`${API_BASE}/users/staff`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          showToast('Thêm mới nhân viên bán vé quầy thành công!');
          setShowAccountModal(false);
          fetchStaff();
        } else {
          showToast(data.message || 'Thêm nhân viên thất bại.', 'error');
        }
      }
    } catch {
      showToast('Lỗi kết nối máy chủ khi lưu tài khoản.', 'error');
    } finally {
      setSavingAccount(false);
    }
  };

  // Khóa / Mở khóa tài khoản
  const handleToggleStatus = async (acc) => {
    const nextStatus = acc.status === 'active' ? 'suspended' : 'active';
    const actionName = nextStatus === 'suspended' ? 'tạm khóa' : 'kích hoạt lại';
    if (!window.confirm(`Bạn có chắc chắn muốn ${actionName} tài khoản "${acc.name}" không?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/users/staff/${acc._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus, role: 'ticket_agent' })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Đã ${actionName} tài khoản thành công!`);
        fetchStaff();
      } else {
        showToast(data.message || 'Không thể cập nhật trạng thái.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối khi thay đổi trạng thái tài khoản.', 'error');
    }
  };

  // Xóa tài khoản nhân viên
  const handleDeleteStaff = async (acc) => {
    if (!window.confirm(`Bạn có chắc muốn xóa vĩnh viễn nhân viên "${acc.name}" (${acc.phone})? Thao tác này không thể hoàn tác.`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/users/staff/${acc._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast('Đã xóa tài khoản nhân viên thành công.');
        fetchStaff();
      } else {
        showToast(data.message || 'Không thể xóa tài khoản nhân viên.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối khi xóa tài khoản.', 'error');
    }
  };

  // Lọc danh sách nhân viên
  const filteredStaff = staffList.filter((acc) => {
    const activeBranchId = user?.branch?.branchId || branchInfo?.branchId;
    if (user?.role === 'ticket_manager' && activeBranchId) {
      if (acc.branch?.branchId !== activeBranchId) {
        return false;
      }
    }

    const matchesSearch = !searchTerm.trim() ||
      (acc.name && acc.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (acc.phone && acc.phone.includes(searchTerm));

    const matchesStatus = filterStatus === 'all' || acc.status === filterStatus;
    const matchesFace = filterFace === 'all' ||
      (filterFace === 'registered' && acc.faceRegistered) ||
      (filterFace === 'unregistered' && !acc.faceRegistered);

    return matchesSearch && matchesStatus && matchesFace;
  });

  const totalStaff = staffList.length;
  const activeStaff = staffList.filter((s) => s.status === 'active').length;
  const suspendedStaff = staffList.filter((s) => s.status === 'suspended').length;
  const faceRegisteredStaff = staffList.filter((s) => s.faceRegistered).length;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Thông báo Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
          padding: '10px 18px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '700',
          color: '#ffffff', backgroundColor: toast.type === 'error' ? '#ef4444' : '#10b981',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          {toast.msg}
        </div>
      )}

      {/* Phần trên: Tiêu đề trang & Thống kê 4 thẻ */}
      <div style={{
        background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0',
        padding: '1.25rem 1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        display: 'flex', flexDirection: 'column', gap: '1.25rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Quản Lý Tài Khoản Nhân Viên Bán Vé
              </h1>
              {branchInfo ? (
                <span style={{ background: '#eff6ff', color: '#1e40af', padding: '2px 8px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: '700', border: '1px solid #bfdbfe' }}>
                  {branchInfo.branchName}
                </span>
              ) : user?.role === 'ticket_manager' ? (
                <span style={{ background: '#f8fafc', color: '#64748b', padding: '2px 8px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: '600', border: '1px solid #e2e8f0' }}>
                  Đang tải chi nhánh...
                </span>
              ) : null}
            </div>
            <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '3px', margin: 0 }}>
              Cấp tài khoản, phân ca làm việc, văn phòng trực ca và quản lý trạng thái nhân sự quầy vé
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleOpenCreateModal}
              className="btn"
              style={{
                backgroundColor: '#2563eb', border: 'none', color: '#ffffff',
                fontWeight: '700', padding: '0.5rem 1.1rem', borderRadius: '8px', fontSize: '0.78rem',
                display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Thêm nhân viên mới
            </button>
          </div>
        </div>

        {/* 4 Thẻ thống kê */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.85rem' }}>
          <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>TỔNG NHÂN VIÊN BÁN VÉ</div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0f172a', margin: '2px 0' }}>{totalStaff}</div>
            <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Nhân sự quầy An Bình Lines</div>
          </div>
          <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>ĐANG HOẠT ĐỘNG</div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#16a34a', margin: '2px 0' }}>{activeStaff}</div>
            <div style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: '600' }}>{totalStaff > 0 ? Math.round((activeStaff / totalStaff) * 100) : 100}% sẵn sàng trực ca</div>
          </div>
          <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>ĐÃ ĐĂNG KÝ KHUÔN MẶT</div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#2563eb', margin: '2px 0' }}>{faceRegisteredStaff}</div>
            <div style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: '600' }}>{totalStaff > 0 ? Math.round((faceRegisteredStaff / totalStaff) * 100) : 0}% đã có sinh trắc học</div>
          </div>
          <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>TẠM KHÓA / NGHỈ VIỆC</div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: suspendedStaff > 0 ? '#dc2626' : '#0f172a', margin: '2px 0' }}>{suspendedStaff}</div>
            <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Tài khoản đang tạm ngưng</div>
          </div>
        </div>
      </div>

      {/* Thanh lọc & Bảng dữ liệu nhân viên */}
      <div className="panel" style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        {/* Bộ lọc */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ flex: '1 1 260px', position: 'relative' }}>
            <input
              type="text"
              placeholder="Tìm theo họ tên, số điện thoại..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%', padding: '0.5rem 0.85rem', borderRadius: '8px',
                border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>Trạng thái:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.78rem', background: '#ffffff' }}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="suspended">Tạm khóa</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>Face ID:</span>
            <select
              value={filterFace}
              onChange={(e) => setFilterFace(e.target.value)}
              style={{ padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.78rem', background: '#ffffff' }}
            >
              <option value="all">Tất cả</option>
              <option value="registered">Đã có Face ID</option>
              <option value="unregistered">Chưa đăng ký Face ID</option>
            </select>
          </div>
        </div>

        {/* Bảng dữ liệu chuẩn một hàng & căn giữa */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b', fontSize: '0.85rem' }}>Đang tải danh sách nhân viên...</div>
        ) : filteredStaff.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: '0.85rem' }}>
            Không tìm thấy nhân viên bán vé nào phù hợp với bộ lọc.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>
                  <th style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>STT</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>Họ và tên</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>Văn phòng / Chi nhánh</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>Số điện thoại</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>Email</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>Dữ liệu khuôn mặt</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>Trạng thái</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((acc, index) => {
                  const statusConf = STATUS_CONFIG[acc.status] || STATUS_CONFIG.active;
                  const officeDisplay = acc.assignedOffice || acc.branch?.branchName || getBranchName(acc.branch?.branchId) || 'Chi nhánh TP. Hồ Chí Minh';

                  return (
                    <tr key={acc._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap', color: '#64748b' }}>
                        {index + 1}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: '700', color: '#0f172a' }}>{acc.name}</span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap', color: '#1e40af', fontWeight: '600' }}>
                        {officeDisplay}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap', fontWeight: '600', color: '#334155' }}>
                        {acc.phone}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap', color: '#64748b' }}>
                        {acc.email || '—'}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        {acc.faceRegistered ? (
                          <span style={{
                            background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0',
                            padding: '3px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: '700',
                            display: 'inline-flex', alignItems: 'center', gap: '4px'
                          }}>
                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#059669' }}></span>
                            Đã đăng ký
                          </span>
                        ) : (
                          <span style={{
                            background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca',
                            padding: '3px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: '600',
                            display: 'inline-block'
                          }}>
                            Chưa đăng ký
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <span style={{
                          background: statusConf.bg, color: statusConf.color, border: `1px solid ${statusConf.border}`,
                          padding: '3px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: '700',
                          display: 'inline-block'
                        }}>
                          {statusConf.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(acc)}
                            title="Chỉnh sửa thông tin"
                            style={{
                              padding: '5px 12px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '600',
                              border: '1px solid #cbd5e1', background: '#ffffff', color: '#2563eb', cursor: 'pointer'
                            }}
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(acc)}
                            title={acc.status === 'active' ? 'Tạm khóa tài khoản' : 'Mở khóa tài khoản'}
                            style={{
                              padding: '5px 12px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '700',
                              border: acc.status === 'active' ? '1px solid #fecaca' : '1px solid #bbf7d0',
                              background: acc.status === 'active' ? '#fee2e2' : '#dcfce7',
                              color: acc.status === 'active' ? '#b91c1c' : '#15803d', cursor: 'pointer'
                            }}
                          >
                            {acc.status === 'active' ? 'Khóa' : 'Mở'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStaff(acc)}
                            title="Xóa tài khoản"
                            style={{
                              padding: '5px 12px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '700',
                              border: '1px solid #fecaca', background: '#fff1f2', color: '#e11d48', cursor: 'pointer'
                            }}
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
      </div>

      {/* Modal Thêm Mới / Chỉnh Sửa theo thiết kế Ban Giám Đốc có Bắt Lỗi */}
      {showAccountModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(2px)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0',
            width: '100%', maxWidth: '520px', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
                {editingAccount ? 'Cập nhật tài khoản nhân viên' : 'Thêm mới nhân viên bán vé quầy'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAccountModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {Object.keys(errors).length > 0 && (
              <div style={{
                marginBottom: '1rem', padding: '0.6rem 0.85rem', borderRadius: '8px',
                background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c',
                fontSize: '0.75rem', fontWeight: '600'
              }}>
                Vui lòng kiểm tra và sửa các thông tin chưa hợp lệ bên dưới.
              </div>
            )}

            <form onSubmit={handleSaveAccount} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {/* Họ và tên */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#334155' }}>
                  Họ và tên *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => { setFormName(e.target.value); clearError('name'); }}
                  placeholder="Ví dụ: Nguyễn Văn Hùng"
                  style={{
                    padding: '0.5rem 0.75rem', borderRadius: '8px',
                    border: errors.name ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                    backgroundColor: errors.name ? '#fef2f2' : '#ffffff',
                    fontSize: '0.8rem', outline: 'none'
                  }}
                />
                {errors.name && (
                  <span style={{ color: '#ef4444', fontSize: '0.72rem', fontWeight: '500' }}>
                    {errors.name}
                  </span>
                )}
              </div>

              {/* 2 cột: SĐT & Email */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#334155' }}>
                    Số điện thoại *
                  </label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => { setFormPhone(e.target.value); clearError('phone'); }}
                    placeholder="Ví dụ: 0944111222"
                    style={{
                      padding: '0.5rem 0.75rem', borderRadius: '8px',
                      border: errors.phone ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                      backgroundColor: errors.phone ? '#fef2f2' : '#ffffff',
                      fontSize: '0.8rem', outline: 'none'
                    }}
                  />
                  {errors.phone && (
                    <span style={{ color: '#ef4444', fontSize: '0.72rem', fontWeight: '500' }}>
                      {errors.phone}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#334155' }}>
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => { setFormEmail(e.target.value); clearError('email'); }}
                    placeholder="agent@anbinhlines.vn"
                    style={{
                      padding: '0.5rem 0.75rem', borderRadius: '8px',
                      border: errors.email ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                      backgroundColor: errors.email ? '#fef2f2' : '#ffffff',
                      fontSize: '0.8rem', outline: 'none'
                    }}
                  />
                  {errors.email && (
                    <span style={{ color: '#ef4444', fontSize: '0.72rem', fontWeight: '500' }}>
                      {errors.email}
                    </span>
                  )}
                </div>
              </div>

              {/* Mật khẩu tài khoản */}
              {editingAccount ? (
                <div style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '10px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem'
                }}>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#0f172a' }}>
                      Mật khẩu tài khoản
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '3px' }}>
                      Mật khẩu mặc định cấp lại: <strong style={{ color: '#2563eb' }}>Anbinh@2026</strong>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetToDefaultPassword}
                    disabled={resettingPw}
                    style={{
                      padding: '0.45rem 0.95rem',
                      borderRadius: '6px',
                      border: '1px solid #bfdbfe',
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      fontWeight: '700',
                      fontSize: '0.75rem',
                      cursor: resettingPw ? 'not-allowed' : 'pointer',
                      boxShadow: '0 1px 2px rgba(37,99,235,0.05)',
                      whiteSpace: 'nowrap',
                      opacity: resettingPw ? 0.7 : 1
                    }}
                  >
                    {resettingPw ? 'Đang đặt lại...' : 'Reset về Anbinh@2026'}
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#334155' }}>
                      Mật khẩu khởi tạo *
                    </label>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      Mặc định: <strong style={{ color: '#2563eb' }}>Anbinh@2026</strong>
                    </span>
                  </div>
                  <input
                    type="text"
                    value={formPassword}
                    onChange={(e) => { setFormPassword(e.target.value); clearError('password'); }}
                    placeholder="Anbinh@2026"
                    style={{
                      padding: '0.5rem 0.75rem', borderRadius: '8px',
                      border: errors.password ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                      backgroundColor: errors.password ? '#fef2f2' : '#ffffff',
                      fontSize: '0.8rem', outline: 'none'
                    }}
                  />
                  {errors.password && (
                    <span style={{ color: '#ef4444', fontSize: '0.72rem', fontWeight: '500' }}>
                      {errors.password}
                    </span>
                  )}
                </div>
              )}

              {/* 2 cột: Văn phòng làm việc cụ thể & Khung giờ làm việc */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#1e40af' }}>
                    Văn phòng làm việc cụ thể *
                  </label>
                  <select
                    value={formOffice}
                    onChange={(e) => { setFormOffice(e.target.value); clearError('office'); }}
                    style={{
                      padding: '0.5rem 0.75rem', borderRadius: '8px',
                      border: errors.office ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                      backgroundColor: errors.office ? '#fef2f2' : '#ffffff',
                      fontSize: '0.8rem', fontWeight: '600', outline: 'none', color: '#0f172a'
                    }}
                  >
                    {officesList.map((off) => (
                      <option key={off.id || off.name} value={off.name}>{off.name}</option>
                    ))}
                  </select>
                  {errors.office && (
                    <span style={{ color: '#ef4444', fontSize: '0.72rem', fontWeight: '500' }}>
                      {errors.office}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#047857' }}>
                    Khung giờ làm việc *
                  </label>
                  <select
                    value={formShift}
                    onChange={(e) => { setFormShift(e.target.value); clearError('shift'); }}
                    style={{
                      padding: '0.5rem 0.75rem', borderRadius: '8px',
                      border: errors.shift ? '1.5px solid #ef4444' : '1px solid #a7f3d0',
                      backgroundColor: errors.shift ? '#fef2f2' : '#ecfdf5',
                      fontSize: '0.8rem', fontWeight: '600', outline: 'none', color: '#065f46'
                    }}
                  >
                    <option value="morning">Ca Sáng (06:30 - 14:30)</option>
                    <option value="evening">Ca Chiều - Tối (14:00 - 22:00)</option>
                  </select>
                  {errors.shift && (
                    <span style={{ color: '#ef4444', fontSize: '0.72rem', fontWeight: '500' }}>
                      {errors.shift}
                    </span>
                  )}
                </div>
              </div>

              {/* Trạng thái tài khoản */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#334155' }}>
                  Trạng thái tài khoản *
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  style={{
                    padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1',
                    fontSize: '0.8rem', fontWeight: '600', outline: 'none', background: '#ffffff', color: '#0f172a'
                  }}
                >
                  <option value="active">Đang hoạt động</option>
                  <option value="inactive">Tạm ngưng</option>
                  <option value="suspended">Tạm khóa</option>
                </select>
              </div>

              {/* Nút hành động */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAccountModal(false)}
                  style={{
                    padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1',
                    background: '#ffffff', color: '#475569', fontWeight: '600', fontSize: '0.8rem', cursor: 'pointer'
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingAccount}
                  style={{
                    padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none',
                    background: '#2563eb', color: '#ffffff', fontWeight: '700', fontSize: '0.8rem',
                    cursor: savingAccount ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 4px rgba(37,99,235,0.2)',
                    opacity: savingAccount ? 0.7 : 1
                  }}
                >
                  {savingAccount ? 'Đang lưu...' : (editingAccount ? 'Lưu thay đổi' : 'Tạo tài khoản')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketStaffAccountsPage;
