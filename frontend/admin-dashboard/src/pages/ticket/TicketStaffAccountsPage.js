import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { AuthContext } from '../../context/AuthContext';
import {
  loadFaceApiModels,
  startWebcam,
  stopWebcam,
  detectFaceAndExtractDescriptor,
  drawDetectionBox,
  clearCanvas,
  captureSnapshot
} from '../../utils/faceApiHelper';
import { getBranchById, getBranchName } from '../../constants/branches';

const API_BASE = 'http://localhost:8000/api/v1';

const STATUS_CONFIG = {
  active: { label: 'Đang hoạt động', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
  inactive: { label: 'Tạm ngưng', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
  suspended: { label: 'Tạm khóa', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' }
};

const exportStaffToCsv = (accounts) => {
  if (!accounts || accounts.length === 0) {
    alert('Không có dữ liệu nhân viên để xuất file.');
    return;
  }

  let csvContent = '\uFEFF';
  csvContent += 'DANH SÁCH NHÂN VIÊN BÁN VÉ QUẦY - AN BÌNH LINES\n';
  csvContent += `Thời gian xuất: ${new Date().toLocaleString('vi-VN')}\n\n`;
  csvContent += 'STT,Họ và tên,Số điện thoại (Đăng nhập),Email,Trạng thái tài khoản,Đăng ký Face ID,Ngày tạo\n';

  accounts.forEach((acc, idx) => {
    const statusLabel = STATUS_CONFIG[acc.status]?.label || acc.status;
    const faceLabel = acc.faceRegistered ? 'Đã có Face ID' : 'Chưa đăng ký';
    const createdDate = acc.createdAt ? new Date(acc.createdAt).toLocaleDateString('vi-VN') : '—';

    csvContent += `${idx + 1},"${acc.name || ''}","${acc.phone || ''}","${acc.email || ''}","${statusLabel}","${faceLabel}","${createdDate}"\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Nhan_Vien_Ban_Ve_AnBinh_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const TicketStaffAccountsPage = () => {
  const { token, user } = useContext(AuthContext);

  const managerBranchId = user?.branch?.branchId;
  const branchInfo = managerBranchId ? getBranchById(managerBranchId) : null;

  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterFace, setFilterFace] = useState('all');

  // Account Modal
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formStatus, setFormStatus] = useState('active');
  const [savingAccount, setSavingAccount] = useState(false);

  // Reset Password Modal
  const [showPwModal, setShowPwModal] = useState(false);
  const [targetPwUser, setTargetPwUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  // Face ID Camera Modal
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [targetFaceUser, setTargetFaceUser] = useState(null);
  const [faceStep, setFaceStep] = useState('idle'); // idle, models_loading, streaming, capturing, registering, success, error
  const [faceMsg, setFaceMsg] = useState('');
  const [capturedSamples, setCapturedSamples] = useState([]);
  const [capturedPhoto, setCapturedPhoto] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const detectTimerRef = useRef(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/staff`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        // Chỉ lọc nhân viên bán vé quầy thuộc chi nhánh của quản lý
        let agents = (data.staff || []).filter(s => s.role === 'ticket_agent');
        const activeBranchId = user?.branch?.branchId || branchInfo?.branchId;
        if (user?.role === 'ticket_manager' && activeBranchId) {
          agents = agents.filter(s => s.branch?.branchId === activeBranchId);
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
  }, [token]);

  useEffect(() => {
    if (token) fetchStaff();
  }, [token, fetchStaff]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingAccount(null);
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormPassword('');
    setFormStatus('active');
    setShowAccountModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (acc) => {
    setEditingAccount(acc);
    setFormName(acc.name || '');
    setFormPhone(acc.phone || '');
    setFormEmail(acc.email || '');
    setFormPassword('');
    setFormStatus(acc.status || 'active');
    setShowAccountModal(true);
  };

  // Save Account (Create or Update)
  const handleSaveAccount = async (e) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) {
      showToast('Vui lòng điền họ tên và số điện thoại.', 'error');
      return;
    }

    setSavingAccount(true);
    try {
      if (editingAccount) {
        const payload = {
          name: formName.trim(),
          phone: formPhone.trim(),
          email: formEmail.trim() || undefined,
          status: formStatus,
          role: 'ticket_agent'
        };
        if (formPassword.trim()) {
          payload.password = formPassword.trim();
        }

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
          showToast('Cập nhật nhân viên bán vé thành công!');
          setShowAccountModal(false);
          fetchStaff();
        } else {
          showToast(data.message || 'Cập nhật thất bại.', 'error');
        }
      } else {
        if (!formPassword.trim()) {
          showToast('Vui lòng nhập mật khẩu khởi tạo cho tài khoản mới.', 'error');
          setSavingAccount(false);
          return;
        }

        const payload = {
          name: formName.trim(),
          phone: formPhone.trim(),
          email: formEmail.trim() || undefined,
          password: formPassword.trim(),
          role: 'ticket_agent',
          status: formStatus,
          branch: user?.branch || (branchInfo ? {
            branchId: branchInfo.branchId,
            branchName: branchInfo.branchName,
            assignedOffices: (branchInfo.offices || []).map(o => o.name)
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
          showToast('Thêm mới nhân viên bán vé thành công!');
          setShowAccountModal(false);
          fetchStaff();
        } else {
          showToast(data.message || 'Thêm nhân viên thất bại.', 'error');
        }
      }
    } catch {
      showToast('Lỗi kết nối khi lưu tài khoản.', 'error');
    } finally {
      setSavingAccount(false);
    }
  };

  // Toggle Suspend / Active
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
        showToast(data.message || 'Không thể đổi trạng thái.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối khi đổi trạng thái.', 'error');
    }
  };

  // Reset Password
  const handleOpenPwModal = (acc) => {
    setTargetPwUser(acc);
    setNewPassword('');
    setShowPwModal(true);
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!newPassword.trim() || newPassword.length < 6) {
      showToast('Mật khẩu mới phải có ít nhất 6 ký tự.', 'error');
      return;
    }

    setSavingPw(true);
    try {
      const res = await fetch(`${API_BASE}/users/staff/${targetPwUser._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password: newPassword.trim(), role: 'ticket_agent' })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Đặt lại mật khẩu cho "${targetPwUser.name}" thành công!`);
        setShowPwModal(false);
      } else {
        showToast(data.message || 'Đặt lại mật khẩu thất bại.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối khi đổi mật khẩu.', 'error');
    } finally {
      setSavingPw(false);
    }
  };

  // Delete Staff
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
        showToast('Đã xóa tài khoản nhân viên.');
        fetchStaff();
      } else {
        showToast(data.message || 'Không thể xóa tài khoản.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối khi xóa tài khoản.', 'error');
    }
  };

  // ── Face ID Registration Webcam Handlers ────────────────────────────────────
  const handleOpenFaceModal = async (acc) => {
    setTargetFaceUser(acc);
    setCapturedSamples([]);
    setCapturedPhoto(null);
    setFaceStep('models_loading');
    setFaceMsg('Đang tải mô hình nhận diện khuôn mặt...');
    setShowFaceModal(true);

    try {
      await loadFaceApiModels();
      setFaceStep('streaming');
      setFaceMsg('Mô hình sẵn sàng, đang kết nối máy ảnh...');

      setTimeout(async () => {
        try {
          if (videoRef.current) {
            const stream = await startWebcam(videoRef.current);
            streamRef.current = stream;
            setFaceMsg('Hãy nhìn thẳng vào camera và bấm "Chụp mẫu khuôn mặt".');

            // Bắt đầu vòng lặp phát hiện khuôn mặt vẽ khung xanh
            detectTimerRef.current = setInterval(async () => {
              if (videoRef.current && canvasRef.current) {
                const res = await detectFaceAndExtractDescriptor(videoRef.current);
                if (res && res.detection) {
                  drawDetectionBox(canvasRef.current, videoRef.current, res.detection.box);
                } else if (canvasRef.current) {
                  clearCanvas(canvasRef.current);
                }
              }
            }, 250);
          }
        } catch {
          setFaceStep('error');
          setFaceMsg('Không thể mở webcam. Vui lòng cấp quyền camera trên trình duyệt.');
        }
      }, 300);
    } catch {
      setFaceStep('error');
      setFaceMsg('Không thể tải tệp mô hình nhận diện khuôn mặt.');
    }
  };

  const handleCloseFaceModal = () => {
    if (detectTimerRef.current) clearInterval(detectTimerRef.current);
    if (streamRef.current) stopWebcam(streamRef.current);
    if (canvasRef.current) clearCanvas(canvasRef.current);
    setShowFaceModal(false);
    setTargetFaceUser(null);
  };

  const handleCaptureSample = async () => {
    if (!videoRef.current) return;
    setFaceMsg('Đang phân tích khuôn mặt...');

    const res = await detectFaceAndExtractDescriptor(videoRef.current);
    if (!res || !res.descriptor) {
      setFaceMsg('Không nhận diện được khuôn mặt rõ ràng. Vui lòng nhìn thẳng và đảm bảo đủ ánh sáng.');
      return;
    }

    const photoBase64 = captureSnapshot(videoRef.current);
    const newArr = [...capturedSamples, Array.from(res.descriptor)];
    setCapturedSamples(newArr);
    if (!capturedPhoto) setCapturedPhoto(photoBase64);

    if (newArr.length < 3) {
      setFaceMsg(`Đã chụp thành công mẫu ${newArr.length}/3. Vui lòng nghiêng nhẹ góc mặt và tiếp tục chụp.`);
    } else {
      setFaceMsg('Đã thu thập đủ 3 mẫu khuôn mặt hợp lệ. Vui lòng bấm "Lưu dữ liệu khuôn mặt" để hoàn tất.');
    }
  };

  const handleSaveFaceId = async () => {
    if (capturedSamples.length === 0) {
      setFaceMsg('Vui lòng chụp ít nhất 1 mẫu khuôn mặt trước khi lưu.');
      return;
    }

    setFaceStep('registering');
    setFaceMsg('Đang đăng ký mẫu Face ID vào hệ thống máy chủ...');

    try {
      const res = await fetch(`${API_BASE}/attendance/register-face`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: targetFaceUser._id,
          faceDescriptors: capturedSamples,
          facePhoto: capturedPhoto
        })
      });

      const data = await res.json();
      if (data.success) {
        setFaceStep('success');
        setFaceMsg(`Đăng ký dữ liệu khuôn mặt thành công cho nhân viên "${targetFaceUser.name}".`);
        showToast('Đăng ký dữ liệu khuôn mặt thành công!');
        fetchStaff();
        setTimeout(handleCloseFaceModal, 2000);
      } else {
        setFaceStep('streaming');
        setFaceMsg(data.message || 'Lỗi khi lưu Face ID.');
      }
    } catch {
      setFaceStep('streaming');
      setFaceMsg('Lỗi kết nối máy chủ khi lưu Face ID.');
    }
  };

  // Filtered List
  const filteredStaff = staffList.filter(acc => {
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
  const activeStaff = staffList.filter(s => s.status === 'active').length;
  const suspendedStaff = staffList.filter(s => s.status === 'suspended').length;
  const faceRegisteredStaff = staffList.filter(s => s.faceRegistered).length;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Toast Alert */}
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

      {/* Top Container: Header & 4 Stat Cards */}
      <div style={{
        background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0',
        padding: '1.25rem 1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        display: 'flex', flexDirection: 'column', gap: '1.25rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
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
            <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '2px', margin: 0 }}>
              Cấp tài khoản, phân quyền, đăng ký dữ liệu khuôn mặt và quản lý trạng thái nhân sự quầy vé thuộc chi nhánh
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => exportStaffToCsv(filteredStaff)}
              className="btn"
              style={{
                backgroundColor: '#ffffff', border: '1px solid #e2e8f0', color: '#334155',
                fontWeight: '600', padding: '0.45rem 0.85rem', borderRadius: '8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer'
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
              Xuất Excel/CSV
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="btn"
              style={{
                backgroundColor: '#2563eb', border: 'none', color: '#ffffff',
                fontWeight: '700', padding: '0.45rem 0.95rem', borderRadius: '8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Thêm nhân viên mới
            </button>
          </div>
        </div>

        {/* 4 Stat Cards Grid */}
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

      {/* Filter Bar & Table Panel */}
      <div className="panel" style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        {/* Filter Controls */}
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

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b', fontSize: '0.85rem' }}>Đang tải danh sách nhân viên...</div>
        ) : filteredStaff.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: '0.85rem' }}>
            Không tìm thấy nhân viên bán vé nào phù hợp với bộ lọc.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>
                  <th style={{ padding: '10px 12px' }}>STT</th>
                  <th style={{ padding: '10px 12px' }}>Họ và tên</th>
                  <th style={{ padding: '10px 12px' }}>Chi nhánh</th>
                  <th style={{ padding: '10px 12px' }}>SĐT (Đăng nhập)</th>
                  <th style={{ padding: '10px 12px' }}>Email</th>
                  <th style={{ padding: '10px 12px' }}>Dữ liệu khuôn mặt</th>
                  <th style={{ padding: '10px 12px' }}>Trạng thái</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((acc, index) => {
                  const statusConf = STATUS_CONFIG[acc.status] || STATUS_CONFIG.active;
                  return (
                    <tr key={acc._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px', color: '#64748b' }}>{index + 1}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '30px', height: '30px', borderRadius: '50%',
                            background: '#eff6ff', color: '#2563eb', fontWeight: '800',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', flexShrink: 0
                          }}>
                            {acc.name ? acc.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div style={{ fontWeight: '700', color: '#0f172a' }}>{acc.name}</div>
                            <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Nhân viên bán vé quầy</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: '0.75rem', color: '#1e40af', fontWeight: '600' }}>
                        {acc.branch?.branchName || getBranchName(acc.branch?.branchId) || 'Chưa phân chi nhánh'}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: '600', color: '#334155' }}>{acc.phone}</td>
                      <td style={{ padding: '10px 12px', color: '#64748b' }}>{acc.email || '—'}</td>
                      <td style={{ padding: '10px 12px' }}>
                        {acc.faceRegistered ? (
                          <span style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: '12px', fontSize: '0.68rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#059669' }}></span>
                            Đã đăng ký
                          </span>
                        ) : (
                          <span style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '2px 8px', borderRadius: '12px', fontSize: '0.68rem', fontWeight: '600' }}>
                            Chưa đăng ký
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          background: statusConf.bg, color: statusConf.color, border: `1px solid ${statusConf.border}`,
                          padding: '2px 8px', borderRadius: '12px', fontSize: '0.68rem', fontWeight: '700'
                        }}>
                          {statusConf.label}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          {/* Face ID Button */}
                          <button
                            onClick={() => handleOpenFaceModal(acc)}
                            title="Đăng ký nhận diện khuôn mặt"
                            style={{
                              padding: '4px 8px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: '600',
                              border: '1px solid #bfdbfe', background: '#eff6ff', color: '#2563eb', cursor: 'pointer',
                              display: 'inline-flex', alignItems: 'center', gap: '4px'
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                            Khuôn mặt
                          </button>

                          {/* Edit Button */}
                          <button
                            onClick={() => handleOpenEditModal(acc)}
                            title="Chỉnh sửa thông tin"
                            style={{
                              padding: '4px 8px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: '600',
                              border: '1px solid #e2e8f0', background: '#ffffff', color: '#334155', cursor: 'pointer'
                            }}
                          >
                            Sửa
                          </button>

                          {/* Reset Password */}
                          <button
                            onClick={() => handleOpenPwModal(acc)}
                            title="Đặt lại mật khẩu"
                            style={{
                              padding: '4px 8px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: '600',
                              border: '1px solid #e2e8f0', background: '#ffffff', color: '#64748b', cursor: 'pointer'
                            }}
                          >
                            Đổi MK
                          </button>

                          {/* Toggle Status */}
                          <button
                            onClick={() => handleToggleStatus(acc)}
                            title={acc.status === 'active' ? 'Tạm khóa' : 'Mở khóa'}
                            style={{
                              padding: '4px 8px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: '700',
                              border: 'none', background: acc.status === 'active' ? '#fee2e2' : '#dcfce7',
                              color: acc.status === 'active' ? '#b91c1c' : '#15803d', cursor: 'pointer'
                            }}
                          >
                            {acc.status === 'active' ? 'Khóa' : 'Mở'}
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteStaff(acc)}
                            title="Xóa tài khoản"
                            style={{
                              padding: '4px 8px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: '700',
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

      {/* MODAL: Thêm / Sửa nhân viên */}
      {showAccountModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15, 23, 42, 0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{ background: '#ffffff', borderRadius: '14px', width: '100%', maxWidth: '480px', padding: '1.5rem', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', margin: '0 0 1rem 0' }}>
              {editingAccount ? 'Chỉnh Sửa Nhân Viên Bán Vé' : 'Thêm Mới Nhân Viên Bán Vé Quầy'}
            </h2>

            <form onSubmit={handleSaveAccount} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Họ và tên *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn Hùng"
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Số điện thoại (Dùng đăng nhập) *
                </label>
                <input
                  type="text"
                  required
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="Ví dụ: 0944111222"
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Email (Nếu có)
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="agent@anbinhlines.vn"
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  {editingAccount ? 'Đổi mật khẩu mới (Bỏ trống nếu không đổi)' : 'Mật khẩu khởi tạo *'}
                </label>
                <input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder={editingAccount ? '••••••••' : 'Tối thiểu 6 ký tự'}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Trạng thái tài khoản
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: '#ffffff' }}
                >
                  <option value="active">Đang hoạt động</option>
                  <option value="suspended">Tạm khóa</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAccountModal(false)}
                  style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontSize: '0.78rem', cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingAccount}
                  style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#ffffff', fontWeight: '700', fontSize: '0.78rem', cursor: 'pointer' }}
                >
                  {savingAccount ? 'Đang lưu...' : 'Lưu tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Đổi mật khẩu nhanh */}
      {showPwModal && targetPwUser && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15, 23, 42, 0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{ background: '#ffffff', borderRadius: '14px', width: '100%', maxWidth: '400px', padding: '1.5rem', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.5rem 0' }}>
              Đặt Lại Mật Khẩu
            </h2>
            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 1rem 0' }}>
              Nhân viên: <strong style={{ color: '#0f172a' }}>{targetPwUser.name}</strong> ({targetPwUser.phone})
            </p>

            <form onSubmit={handleSavePassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Mật khẩu mới *
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nhập tối thiểu 6 ký tự..."
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowPwModal(false)}
                  style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontSize: '0.78rem', cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingPw}
                  style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#ffffff', fontWeight: '700', fontSize: '0.78rem', cursor: 'pointer' }}
                >
                  {savingPw ? 'Đang cập nhật...' : 'Xác nhận đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Đăng ký nhận diện khuôn mặt */}
      {showFaceModal && targetFaceUser && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15, 23, 42, 0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '520px', padding: '1.5rem', boxShadow: '0 15px 35px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  Đăng Ký Nhận Diện Khuôn Mặt
                </h2>
                <p style={{ fontSize: '0.72rem', color: '#64748b', margin: '2px 0 0 0' }}>
                  Nhân viên: <strong style={{ color: '#2563eb' }}>{targetFaceUser.name}</strong> ({targetFaceUser.phone})
                </p>
              </div>
              <button
                onClick={handleCloseFaceModal}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Video Container */}
            <div style={{ position: 'relative', width: '100%', height: '320px', background: '#0f172a', borderRadius: '12px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <canvas
                ref={canvasRef}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
              />

              {faceStep === 'models_loading' && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: '0.82rem', fontWeight: '600' }}>
                  Đang tải mô hình nhận diện khuôn mặt...
                </div>
              )}
            </div>

            {/* Status Feedback Message */}
            <div style={{
              margin: '0.75rem 0', padding: '0.65rem 0.85rem', borderRadius: '8px',
              background: faceStep === 'success' ? '#ecfdf5' : '#eff6ff',
              border: `1px solid ${faceStep === 'success' ? '#a7f3d0' : '#bfdbfe'}`,
              color: faceStep === 'success' ? '#047857' : '#1e40af',
              fontSize: '0.75rem', fontWeight: '600'
            }}>
              {faceMsg}
            </div>

            {/* Sample Counter Progress */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>
                Mẫu khuôn mặt thu thập: <strong>{capturedSamples.length}/3</strong>
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[0, 1, 2].map((idx) => (
                  <div
                    key={idx}
                    style={{
                      width: '18px', height: '18px', borderRadius: '50%',
                      background: idx < capturedSamples.length ? '#10b981' : '#e2e8f0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.65rem', color: '#ffffff', fontWeight: '800'
                    }}
                  >
                    {idx < capturedSamples.length ? (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                    ) : idx + 1}
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
              <button
                type="button"
                onClick={handleCaptureSample}
                disabled={capturedSamples.length >= 3 || faceStep === 'registering'}
                style={{
                  flex: 1, padding: '0.6rem', borderRadius: '8px', border: '1px solid #2563eb',
                  background: '#eff6ff', color: '#2563eb', fontWeight: '700', fontSize: '0.78rem',
                  cursor: capturedSamples.length >= 3 ? 'not-allowed' : 'pointer',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                Chụp mẫu ({capturedSamples.length}/3)
              </button>

              <button
                type="button"
                onClick={handleSaveFaceId}
                disabled={capturedSamples.length === 0 || faceStep === 'registering'}
                style={{
                  flex: 1, padding: '0.6rem', borderRadius: '8px', border: 'none',
                  background: capturedSamples.length > 0 ? '#10b981' : '#94a3b8',
                  color: '#ffffff', fontWeight: '700', fontSize: '0.78rem',
                  cursor: capturedSamples.length === 0 ? 'not-allowed' : 'pointer',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}
              >
                {faceStep === 'registering' ? 'Đang lưu dữ liệu...' : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                    Lưu dữ liệu khuôn mặt
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketStaffAccountsPage;
