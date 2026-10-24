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

const API_BASE = 'http://localhost:8000/api/v1';

const FLEET_ROLE_CONFIG = {
  driver: {
    label: 'Tài xế',
    desc: 'Lái xe chính / phụ theo chuyến',
    badgeBg: '#dcfce7',
    badgeColor: '#15803d',
    badgeBorder: '#bbf7d0',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="1" y="3" width="15" height="13" rx="2" />
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    )
  },
  attendant: {
    label: 'Phụ xe',
    desc: 'Hỗ trợ đón khách, soát vé & hành lý',
    badgeBg: '#fce7f3',
    badgeColor: '#be185d',
    badgeBorder: '#fbcfe8',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <polyline points="17 11 19 13 23 9" />
      </svg>
    )
  }
};

const STATUS_CONFIG = {
  active: { label: 'Đang hoạt động', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
  inactive: { label: 'Tạm ngưng', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
  suspended: { label: 'Tạm khóa', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' }
};

const exportFleetAccountsToCsv = (accounts) => {
  if (!accounts || accounts.length === 0) {
    alert('Không có dữ liệu tài khoản đội xe để xuất file.');
    return;
  }

  let csvContent = '\uFEFF';
  csvContent += 'DANH SÁCH TÀI KHOẢN ĐỘI XE (TÀI XẾ & PHỤ XE) - AN BÌNH LINES\n';
  csvContent += `Thời gian xuất: ${new Date().toLocaleString('vi-VN')}\n\n`;
  csvContent += 'STT,Họ và tên,Số điện thoại (Đăng nhập),Email,Vai trò,Trạng thái tài khoản,Đăng ký Face ID,Ngày tạo\n';

  accounts.forEach((acc, idx) => {
    const roleLabel = FLEET_ROLE_CONFIG[acc.role]?.label || acc.role;
    const statusLabel = STATUS_CONFIG[acc.status]?.label || acc.status;
    const faceLabel = acc.faceRegistered ? 'Đã có Face ID' : 'Chưa đăng ký';
    const createdDate = acc.createdAt ? new Date(acc.createdAt).toLocaleDateString('vi-VN') : '—';

    csvContent += `${idx + 1},"${acc.name || ''}","${acc.phone || ''}","${acc.email || ''}","${roleLabel}","${statusLabel}","${faceLabel}","${createdDate}"\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Tai_Khoan_Doi_Xe_AnBinh_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const OpsFleetAccountsPage = () => {
  const { token } = useContext(AuthContext);

  // Danh sách nhân sự
  const [fleetStaff, setFleetStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Bộ lọc & Tìm kiếm
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all'); // all, driver, attendant
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, suspended
  const [filterFace, setFilterFace] = useState('all'); // all, registered, unregistered

  // Modal Thêm / Sửa tài khoản
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState('driver');
  const [formStatus, setFormStatus] = useState('active');
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Modal Đổi Mật Khẩu Nhanh
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordTargetUser, setPasswordTargetUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Modal Face ID Enrollment
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [faceTargetUser, setFaceTargetUser] = useState(null);
  const [faceCameraActive, setFaceCameraActive] = useState(false);
  const [faceModelsReady, setFaceModelsReady] = useState(false);
  const [faceSamples, setFaceSamples] = useState([]);
  const [faceCapturedPhoto, setFaceCapturedPhoto] = useState(null);
  const [faceCapturing, setFaceCapturing] = useState(false);
  const [faceSubmitting, setFaceSubmitting] = useState(false);
  const [faceError, setFaceError] = useState('');

  // Modal Xem Ảnh Face ID
  const [previewPhotoStaff, setPreviewPhotoStaff] = useState(null);

  const faceVideoRef = useRef(null);
  const faceCanvasRef = useRef(null);
  const faceStreamRef = useRef(null);
  const faceScanLoopRef = useRef(null);

  // Modal Xác nhận
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    title: '',
    message: '',
    onConfirm: null,
    confirmText: 'Xác nhận',
    confirmColor: '#2563eb'
  });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Tải danh sách nhân sự đội xe
  const fetchFleetStaff = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/staff`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.staff)) {
        // Lọc riêng đội xe: chỉ lấy tài xế (driver) và phụ xe (attendant)
        const fleetMembers = data.staff.filter(
          (u) => u.role === 'driver' || u.role === 'attendant'
        );
        setFleetStaff(fleetMembers);
      } else {
        showToast(data.message || 'Không thể tải danh sách tài khoản đội xe.', 'error');
      }
    } catch (err) {
      console.error('Lỗi khi tải tài khoản đội xe:', err);
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchFleetStaff();
    }
  }, [token, fetchFleetStaff]);

  // Bộ lọc dữ liệu
  const filteredStaff = fleetStaff.filter((staff) => {
    if (filterRole !== 'all' && staff.role !== filterRole) return false;
    if (filterStatus !== 'all' && staff.status !== filterStatus) return false;
    if (filterFace === 'registered' && !staff.faceRegistered) return false;
    if (filterFace === 'unregistered' && staff.faceRegistered) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = staff.name?.toLowerCase().includes(q);
      const matchPhone = staff.phone?.toLowerCase().includes(q);
      const matchEmail = staff.email?.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchEmail) return false;
    }

    return true;
  });

  // Thống kê nhanh KPI
  const totalCount = fleetStaff.length;
  const driverCount = fleetStaff.filter((s) => s.role === 'driver').length;
  const attendantCount = fleetStaff.filter((s) => s.role === 'attendant').length;
  const activeCount = fleetStaff.filter((s) => s.status === 'active').length;
  const faceCount = fleetStaff.filter((s) => s.faceRegistered).length;
  const facePercent = totalCount > 0 ? Math.round((faceCount / totalCount) * 100) : 0;

  // ─── Modal Thêm / Chỉnh Sửa ────────────────────────────────────────────────
  const handleOpenCreateModal = () => {
    setEditingAccount(null);
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormPassword('');
    setFormRole('driver');
    setFormStatus('active');
    setModalError('');
    setShowAccountModal(true);
  };

  const handleOpenEditModal = (staff) => {
    setEditingAccount(staff);
    setFormName(staff.name || '');
    setFormPhone(staff.phone || '');
    setFormEmail(staff.email || '');
    setFormPassword(''); // Để trống nếu không muốn đổi
    setFormRole(staff.role || 'driver');
    setFormStatus(staff.status || 'active');
    setModalError('');
    setShowAccountModal(true);
  };

  const handleSaveAccount = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!formName.trim()) {
      setModalError('Vui lòng nhập họ và tên nhân viên.');
      return;
    }

    const cleanPhone = formPhone.trim();
    if (!cleanPhone) {
      setModalError('Vui lòng nhập số điện thoại (tên đăng nhập).');
      return;
    }

    // Validate phone VN cơ bản: 10 chữ số
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(cleanPhone)) {
      setModalError('Số điện thoại không hợp lệ (phải gồm đúng 10 chữ số).');
      return;
    }

    if (!editingAccount && !formPassword.trim()) {
      setModalError('Vui lòng nhập mật khẩu khởi tạo cho tài khoản mới.');
      return;
    }

    if (formPassword.trim() && formPassword.trim().length < 6) {
      setModalError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    setModalSubmitting(true);
    try {
      const payload = {
        name: formName.trim(),
        phone: cleanPhone,
        email: formEmail.trim() || undefined,
        role: formRole,
        status: formStatus
      };

      if (formPassword.trim()) {
        payload.password = formPassword.trim();
      }

      const url = editingAccount
        ? `${API_BASE}/users/staff/${editingAccount._id}`
        : `${API_BASE}/users/staff`;

      const method = editingAccount ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok && data.success) {
        showToast(
          editingAccount
            ? 'Cập nhật tài khoản đội xe thành công!'
            : 'Đã tạo tài khoản nhân sự đội xe mới thành công!'
        );
        setShowAccountModal(false);
        fetchFleetStaff();
      } else {
        setModalError(data.message || 'Không thể lưu thông tin tài khoản.');
      }
    } catch (err) {
      console.error(err);
      setModalError('Lỗi máy chủ khi lưu tài khoản.');
    } finally {
      setModalSubmitting(false);
    }
  };

  // ─── Modal Đổi Mật Khẩu Nhanh ──────────────────────────────────────────────
  const handleOpenPasswordModal = (staff) => {
    setPasswordTargetUser(staff);
    setNewPassword('');
    setPasswordError('');
    setShowPasswordModal(true);
  };

  const handleSaveNewPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setPasswordError('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }

    setPasswordSubmitting(true);
    setPasswordError('');
    try {
      const res = await fetch(`${API_BASE}/users/staff/${passwordTargetUser._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ password: newPassword })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Đã đổi mật khẩu thành công cho ${passwordTargetUser.name}!`);
        setShowPasswordModal(false);
      } else {
        setPasswordError(data.message || 'Không thể cập nhật mật khẩu.');
      }
    } catch (err) {
      setPasswordError('Lỗi kết nối máy chủ.');
    } finally {
      setPasswordSubmitting(false);
    }
  };

  // ─── Khóa / Mở Khóa Tài Khoản ──────────────────────────────────────────────
  const handleToggleStatus = (staff) => {
    const isCurrentlyActive = staff.status === 'active';
    const targetStatus = isCurrentlyActive ? 'suspended' : 'active';
    const actionLabel = isCurrentlyActive ? 'Tạm khóa' : 'Kích hoạt lại';

    setConfirmModal({
      show: true,
      title: `${actionLabel} tài khoản?`,
      message: `Bạn có chắc muốn ${actionLabel.toLowerCase()} tài khoản của ${staff.name} (${staff.phone})? ${
        isCurrentlyActive
          ? 'Nhân viên này sẽ không thể đăng nhập hoặc điểm danh chuyến xe.'
          : 'Nhân viên sẽ được phép đăng nhập và nhận nhiệm vụ chuyến xe.'
      }`,
      confirmText: actionLabel,
      confirmColor: isCurrentlyActive ? '#dc2626' : '#16a34a',
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_BASE}/users/staff/${staff._id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ status: targetStatus })
          });
          const data = await res.json();
          if (res.ok && data.success) {
            showToast(`Đã ${actionLabel.toLowerCase()} tài khoản thành công!`);
            fetchFleetStaff();
          } else {
            showToast(data.message || 'Thao tác không thành công.', 'error');
          }
        } catch (err) {
          showToast('Lỗi máy chủ khi cập nhật trạng thái.', 'error');
        } finally {
          setConfirmModal((prev) => ({ ...prev, show: false }));
        }
      }
    });
  };

  // ─── Xóa Tài Khoản ────────────────────────────────────────────────────────
  const handleDeleteAccount = (staff) => {
    setConfirmModal({
      show: true,
      title: 'Xóa tài khoản đội xe?',
      message: `Cảnh báo: Hành động này sẽ xóa vĩnh viễn tài khoản của ${staff.name} (${staff.phone} - ${FLEET_ROLE_CONFIG[staff.role]?.label || staff.role}). Dữ liệu chấm công và lịch sử gắn chuyến trước đó sẽ được giữ nguyên dạng lưu trữ. Bạn có chắc chắn muốn xóa?`,
      confirmText: 'Xóa vĩnh viễn',
      confirmColor: '#dc2626',
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_BASE}/users/staff/${staff._id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          if (res.ok && data.success) {
            showToast('Đã xóa tài khoản thành công!');
            fetchFleetStaff();
          } else {
            showToast(data.message || 'Không thể xóa tài khoản.', 'error');
          }
        } catch (err) {
          showToast('Lỗi máy chủ khi xóa tài khoản.', 'error');
        } finally {
          setConfirmModal((prev) => ({ ...prev, show: false }));
        }
      }
    });
  };

  // ─── Modal Đăng Ký Face ID Bằng Webcam ─────────────────────────────────────
  const openFaceModal = async (staff) => {
    setFaceTargetUser(staff);
    setFaceSamples([]);
    setFaceCapturedPhoto(staff.facePhoto || null);
    setFaceError('');
    setFaceCapturing(false);
    setShowFaceModal(true);

    try {
      await loadFaceApiModels();
      setFaceModelsReady(true);
      setTimeout(async () => {
        try {
          if (faceVideoRef.current) {
            const stream = await startWebcam(faceVideoRef.current);
            faceStreamRef.current = stream;
            setFaceCameraActive(true);
          }
        } catch (e) {
          setFaceError('Không thể mở Camera để quét khuôn mặt. Vui lòng cấp quyền webcam trên trình duyệt.');
        }
      }, 250);
    } catch (err) {
      setFaceError('Không thể nạp mô hình nhận diện khuôn mặt: ' + err.message);
    }
  };

  const closeFaceModal = () => {
    if (faceScanLoopRef.current) {
      cancelAnimationFrame(faceScanLoopRef.current);
      faceScanLoopRef.current = null;
    }
    if (faceStreamRef.current) {
      stopWebcam(faceStreamRef.current);
      faceStreamRef.current = null;
    }
    clearCanvas(faceCanvasRef.current);
    setFaceCameraActive(false);
    setFaceTargetUser(null);
    setFaceSamples([]);
    setShowFaceModal(false);
  };

  // Vòng quét nhận diện & vẽ bounding box
  useEffect(() => {
    let active = true;

    const runScan = async () => {
      if (!active || !faceCameraActive || !faceVideoRef.current || !faceCanvasRef.current) return;

      if (faceVideoRef.current.readyState === 4) {
        try {
          const { detection } = await detectFaceAndExtractDescriptor(faceVideoRef.current);
          if (active && faceCanvasRef.current && faceVideoRef.current) {
            if (detection) {
              drawDetectionBox(
                faceCanvasRef.current,
                faceVideoRef.current,
                detection,
                'Khuôn mặt hợp lệ',
                '#10b981',
                true
              );
            } else {
              clearCanvas(faceCanvasRef.current);
            }
          }
        } catch (e) {}
      }

      if (active && faceCameraActive) {
        faceScanLoopRef.current = requestAnimationFrame(runScan);
      }
    };

    if (faceCameraActive && faceModelsReady) {
      runScan();
    }

    return () => {
      active = false;
      if (faceScanLoopRef.current) cancelAnimationFrame(faceScanLoopRef.current);
    };
  }, [faceCameraActive, faceModelsReady]);

  // Chụp mẫu khuôn mặt (Sample Capture)
  const captureFaceSample = async () => {
    if (!faceVideoRef.current) return;
    setFaceCapturing(true);
    setFaceError('');

    try {
      const { descriptor } = await detectFaceAndExtractDescriptor(faceVideoRef.current);
      if (!descriptor) {
        setFaceError('Không phát hiện thấy khuôn mặt. Vui lòng nhìn thẳng vào ống kính camera!');
      } else {
        setFaceSamples((prev) => [...prev, descriptor]);
        // Tự động chụp lại ảnh snapshot chất lượng cao làm ảnh hiển thị Face ID
        const snapshot = captureSnapshot(faceVideoRef.current, 0.85, 480);
        if (snapshot) {
          setFaceCapturedPhoto(snapshot);
        }
        showToast(`Đã thu thập mẫu ${faceSamples.length + 1}/3 thành công!`, 'success');
      }
    } catch (err) {
      setFaceError('Lỗi trích xuất khuôn mặt: ' + err.message);
    } finally {
      setFaceCapturing(false);
    }
  };

  // Lưu Face ID vào DB qua attendance/register-face
  const saveFaceRegistration = async () => {
    if (faceSamples.length === 0) {
      setFaceError('Vui lòng chụp ít nhất 1 mẫu khuôn mặt!');
      return;
    }

    setFaceSubmitting(true);
    setFaceError('');

    try {
      const res = await fetch(`${API_BASE}/attendance/register-face`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: faceTargetUser._id,
          faceDescriptors: faceSamples,
          facePhoto: faceCapturedPhoto
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        showToast(data.message || 'Đăng ký khuôn mặt thành công!', 'success');
        closeFaceModal();
        fetchFleetStaff();
      } else {
        setFaceError(data.message || 'Không thể đăng ký khuôn mặt.');
      }
    } catch (err) {
      setFaceError('Lỗi máy chủ khi lưu khuôn mặt.');
    } finally {
      setFaceSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '0 0.5rem 2rem 0.5rem' }}>
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            backgroundColor: toast.type === 'error' ? '#ef4444' : '#10b981',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '10px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
            zIndex: 99999,
            fontWeight: '600',
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'slideIn 0.2s ease-out'
          }}
        >
          {toast.type === 'error' ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          )}
          {toast.msg}
        </div>
      )}

      {/* ─── Header & Action Bar ────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.25rem'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
              Quản Lý Tài Khoản Đội Xe
            </h1>
            <span
              style={{
                background: '#eff6ff',
                color: '#2563eb',
                border: '1px solid #bfdbfe',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.7rem',
                fontWeight: '700'
              }}
            >
              Tài xế &amp; Phụ xe
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '4px', margin: 0 }}>
            Phân quyền Quản lý Vận tải: Thêm mới, quản lý thông tin đăng nhập, phân vai trò tổ lái và đăng ký sinh trắc Face ID cho tài xế &amp; phụ xe.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => exportFleetAccountsToCsv(filteredStaff)}
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#334155',
              fontWeight: '600',
              padding: '0.55rem 0.95rem',
              borderRadius: '8px',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Xuất Excel/CSV
          </button>

          <button
            onClick={fetchFleetStaff}
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#334155',
              fontWeight: '600',
              padding: '0.55rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
            title="Làm mới dữ liệu"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            Làm mới
          </button>

          <button
            onClick={handleOpenCreateModal}
            style={{
              backgroundColor: '#2563eb',
              border: 'none',
              color: '#ffffff',
              fontWeight: '700',
              padding: '0.55rem 1.15rem',
              borderRadius: '8px',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(37,99,235,0.25)'
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            + Thêm tài khoản đội xe
          </button>
        </div>
      </div>

      {/* ─── 5 KPI Summary Cards ────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '0.85rem',
          marginBottom: '1.25rem'
        }}
      >
        {/* Card 1: Tổng số */}
        <div
          style={{
            background: '#ffffff',
            padding: '0.9rem 1.1rem',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
              TỔNG NHÂN SỰ ĐỘI XE
            </span>
            <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#0f172a' }}>
            {totalCount} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>tài khoản</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: '600', marginTop: '2px' }}>
            Sẵn sàng điều phối chuyến xe
          </div>
        </div>

        {/* Card 2: Tài xế */}
        <div
          style={{
            background: '#ffffff',
            padding: '0.9rem 1.1rem',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
              TÀI XẾ CHÍNH (DRIVER)
            </span>
            <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            </div>
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#15803d' }}>
            {driverCount} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>bác tài</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '500', marginTop: '2px' }}>
            Chiếm {totalCount > 0 ? Math.round((driverCount / totalCount) * 100) : 0}% tổng đội ngũ
          </div>
        </div>

        {/* Card 3: Phụ xe */}
        <div
          style={{
            background: '#ffffff',
            padding: '0.9rem 1.1rem',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
              PHỤ XE (ATTENDANT)
            </span>
            <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#fdf2f8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#db2777' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>
            </div>
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#be185d' }}>
            {attendantCount} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>nhân viên</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '500', marginTop: '2px' }}>
            Chiếm {totalCount > 0 ? Math.round((attendantCount / totalCount) * 100) : 0}% tổng đội ngũ
          </div>
        </div>

        {/* Card 4: Hoạt động */}
        <div
          style={{
            background: '#ffffff',
            padding: '0.9rem 1.1rem',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
              ĐANG HOẠT ĐỘNG
            </span>
            <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 14 14"/></svg>
            </div>
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#047857' }}>
            {activeCount} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>/ {totalCount}</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: totalCount - activeCount > 0 ? '#dc2626' : '#16a34a', fontWeight: '600', marginTop: '2px' }}>
            {totalCount - activeCount > 0 ? `${totalCount - activeCount} tài khoản tạm khóa/ngưng` : '100% tài khoản thông suốt'}
          </div>
        </div>

        {/* Card 5: Sinh trắc Face ID */}
        <div
          style={{
            background: '#ffffff',
            padding: '0.9rem 1.1rem',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
              ĐĂNG KÝ FACE ID
            </span>
            <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#fdf4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a855f7' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/><circle cx="12" cy="12" r="3"/></svg>
            </div>
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#7e22ce' }}>
            {faceCount} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>({facePercent}%)</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: facePercent >= 80 ? '#16a34a' : '#d97706', fontWeight: '600', marginTop: '2px' }}>
            {facePercent >= 80 ? 'Đạt chuẩn xác thực sinh trắc học' : 'Cần bổ sung mẫu mặt'}
          </div>
        </div>
      </div>

      {/* ─── Filter & Search Box ────────────────────────────────────────────── */}
      <div
        style={{
          background: '#ffffff',
          padding: '1rem',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          marginBottom: '1rem',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'center',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
        }}
      >
        {/* Input Tìm kiếm */}
        <div style={{ flex: '1 1 240px', position: 'relative' }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên, SĐT đăng nhập, email..."
            style={{
              width: '100%',
              padding: '0.55rem 0.75rem 0.55rem 2.2rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.82rem',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2"
            style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>

        {/* Lọc theo Vai trò */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>Vai trò:</span>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            style={{
              padding: '0.55rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.82rem',
              background: '#ffffff',
              cursor: 'pointer'
            }}
          >
            <option value="all">Tất cả vai trò</option>
            <option value="driver">Tài xế (Driver)</option>
            <option value="attendant">Phụ xe (Attendant)</option>
          </select>
        </div>

        {/* Lọc theo Trạng thái */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>Trạng thái:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '0.55rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.82rem',
              background: '#ffffff',
              cursor: 'pointer'
            }}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Hoạt động</option>
            <option value="suspended">Tạm khóa</option>
            <option value="inactive">Tạm ngưng</option>
          </select>
        </div>

        {/* Lọc theo Face ID */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>Face ID:</span>
          <select
            value={filterFace}
            onChange={(e) => setFilterFace(e.target.value)}
            style={{
              padding: '0.55rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.82rem',
              background: '#ffffff',
              cursor: 'pointer'
            }}
          >
            <option value="all">Tất cả Face ID</option>
            <option value="registered">Đã đăng ký Face ID</option>
            <option value="unregistered">Chưa có Face ID</option>
          </select>
        </div>

        {/* Nút Xóa lọc nếu có giá trị */}
        {(searchTerm || filterRole !== 'all' || filterStatus !== 'all' || filterFace !== 'all') && (
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterRole('all');
              setFilterStatus('all');
              setFilterFace('all');
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#dc2626',
              fontSize: '0.75rem',
              fontWeight: '600',
              cursor: 'pointer',
              padding: '0.4rem 0.6rem'
            }}
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* ─── Danh Sách Tài Khoản Đội Xe ─────────────────────────────────────── */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}
      >
        <div
          style={{
            padding: '0.85rem 1.15rem',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#fafafa'
          }}
        >
          <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#0f172a' }}>
            Danh sách nhân viên đội xe ({filteredStaff.length} tài khoản)
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Tự động đồng bộ với hệ thống phân công chuyến &amp; điểm danh GPS
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#2563eb', fontWeight: '600' }}>
            <div style={{ width: '28px', height: '28px', margin: '0 auto 10px auto', border: '3px solid #bfdbfe', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            Đang tải dữ liệu tài khoản đội xe...
          </div>
        ) : filteredStaff.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#64748b' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto', color: '#94a3b8' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
            </div>
            <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#0f172a' }}>
              Không tìm thấy tài khoản nhân viên nào
            </div>
            <p style={{ fontSize: '0.8rem', marginTop: '4px', maxWidth: '380px', margin: '4px auto 16px auto' }}>
              Không có tài xế hoặc phụ xe nào khớp với điều kiện lọc. Bạn có thể thêm tài khoản mới ngay bây giờ.
            </p>
            <button
              onClick={handleOpenCreateModal}
              style={{
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              + Thêm tài khoản mới
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: '700', width: '50px' }}>STT</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: '700' }}>Nhân sự</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: '700' }}>SĐT (Đăng nhập)</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: '700' }}>Vai trò</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: '700' }}>Sinh trắc Face ID</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: '700' }}>Trạng thái</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: '700' }}>Ngày tạo</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: '700', textAlign: 'right' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((staff, idx) => {
                  const roleConfig = FLEET_ROLE_CONFIG[staff.role] || FLEET_ROLE_CONFIG.driver;
                  const statusConfig = STATUS_CONFIG[staff.status] || STATUS_CONFIG.active;
                  const initials = (staff.name || 'AB')
                    .split(' ')
                    .map((w) => w[0])
                    .slice(-2)
                    .join('')
                    .toUpperCase();

                  return (
                    <tr
                      key={staff._id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* STT */}
                      <td style={{ padding: '0.85rem 1rem', color: '#94a3b8', fontWeight: '600' }}>
                        {idx + 1}
                      </td>

                      {/* Họ tên & Avatar */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: staff.role === 'driver' ? '#dcfce7' : '#fce7f3',
                              color: staff.role === 'driver' ? '#15803d' : '#be185d',
                              fontWeight: '700',
                              fontSize: '0.78rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: `1.5px solid ${staff.role === 'driver' ? '#bbf7d0' : '#fbcfe8'}`,
                              flexShrink: 0
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.85rem' }}>
                              {staff.name}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              {staff.email || 'Chưa cập nhật email'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Số điện thoại */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: '700', color: '#1e293b', letterSpacing: '0.3px' }}>
                          {staff.phone}
                        </div>
                        <span style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: '500' }}>
                          Dùng đăng nhập App
                        </span>
                      </td>

                      {/* Vai trò */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: roleConfig.badgeBg,
                            color: roleConfig.badgeColor,
                            border: `1px solid ${roleConfig.badgeBorder}`,
                            padding: '3px 9px',
                            borderRadius: '12px',
                            fontWeight: '700',
                            fontSize: '0.72rem'
                          }}
                        >
                          {roleConfig.icon}
                          {roleConfig.label}
                        </div>
                      </td>

                      {/* Sinh trắc Face ID */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {staff.faceRegistered ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {staff.facePhoto ? (
                              <div
                                onClick={() => setPreviewPhotoStaff(staff)}
                                style={{
                                  cursor: 'pointer',
                                  flexShrink: 0,
                                  position: 'relative'
                                }}
                                title="Bấm để xem ảnh mẫu Face ID phóng to"
                              >
                                <img
                                  src={staff.facePhoto}
                                  alt={staff.name}
                                  style={{
                                    width: '34px',
                                    height: '34px',
                                    borderRadius: '8px',
                                    objectFit: 'cover',
                                    border: '1.5px solid #10b981',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                    display: 'block',
                                    transition: 'transform 0.15s ease'
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.12)')}
                                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                                />
                              </div>
                            ) : (
                              <div
                                onClick={() => setPreviewPhotoStaff(staff)}
                                style={{
                                  width: '34px',
                                  height: '34px',
                                  borderRadius: '8px',
                                  background: '#f1f5f9',
                                  border: '1.5px dashed #cbd5e1',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#64748b',
                                  cursor: 'pointer',
                                  flexShrink: 0
                                }}
                                title="Chưa có ảnh lưu trữ - Bấm xem chi tiết"
                              >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                              </div>
                            )}

                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span
                                  style={{
                                    background: '#ecfdf5',
                                    color: '#047857',
                                    border: '1px solid #a7f3d0',
                                    padding: '2px 7px',
                                    borderRadius: '8px',
                                    fontSize: '0.68rem',
                                    fontWeight: '700'
                                  }}
                                >
                                  Đã có Face ID
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                                <button
                                  onClick={() => setPreviewPhotoStaff(staff)}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: staff.facePhoto ? '#2563eb' : '#d97706',
                                    fontSize: '0.68rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    padding: 0,
                                    textDecoration: 'underline'
                                  }}
                                >
                                  {staff.facePhoto ? 'Xem ảnh' : 'Chưa có ảnh'}
                                </button>
                                <span style={{ color: '#cbd5e1', fontSize: '0.65rem' }}>•</span>
                                <button
                                  onClick={() => openFaceModal(staff)}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#64748b',
                                    fontSize: '0.68rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    padding: 0
                                  }}
                                  title="Quét lại mẫu khuôn mặt mới"
                                >
                                  Cập nhật
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => openFaceModal(staff)}
                            style={{
                              background: '#eff6ff',
                              color: '#2563eb',
                              border: '1px solid #bfdbfe',
                              padding: '3px 8px',
                              borderRadius: '8px',
                              fontSize: '0.7rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <line x1="12" y1="5" x2="12" y2="19" />
                              <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            Đăng ký Face ID
                          </button>
                        )}
                      </td>

                      {/* Trạng thái */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            background: statusConfig.bg,
                            color: statusConfig.color,
                            border: `1px solid ${statusConfig.border}`,
                            padding: '3px 8px',
                            borderRadius: '10px',
                            fontSize: '0.7rem',
                            fontWeight: '700',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: statusConfig.color
                            }}
                          />
                          {statusConfig.label}
                        </span>
                      </td>

                      {/* Ngày tạo */}
                      <td style={{ padding: '0.85rem 1rem', color: '#64748b', fontSize: '0.75rem' }}>
                        {staff.createdAt ? new Date(staff.createdAt).toLocaleDateString('vi-VN') : '—'}
                      </td>

                      {/* Hành động */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                          {/* Nút Sửa */}
                          <button
                            onClick={() => handleOpenEditModal(staff)}
                            style={{
                              backgroundColor: '#ffffff',
                              border: '1px solid #cbd5e1',
                              color: '#2563eb',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                            title="Chỉnh sửa thông tin"
                          >
                            Sửa
                          </button>

                          {/* Nút Đổi mật khẩu */}
                          <button
                            onClick={() => handleOpenPasswordModal(staff)}
                            style={{
                              backgroundColor: '#ffffff',
                              border: '1px solid #cbd5e1',
                              color: '#475569',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                            title="Cấp đổi mật khẩu mới"
                          >
                            Đổi MK
                          </button>

                          {/* Nút Khóa / Kích hoạt */}
                          <button
                            onClick={() => handleToggleStatus(staff)}
                            style={{
                              backgroundColor: '#ffffff',
                              border: '1px solid #cbd5e1',
                              color: staff.status === 'active' ? '#b45309' : '#16a34a',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                            title={staff.status === 'active' ? 'Tạm khóa tài khoản' : 'Mở khóa tài khoản'}
                          >
                            {staff.status === 'active' ? 'Khóa' : 'Mở'}
                          </button>

                          {/* Nút Xóa */}
                          <button
                            onClick={() => handleDeleteAccount(staff)}
                            style={{
                              backgroundColor: '#ffffff',
                              border: '1px solid #fee2e2',
                              color: '#dc2626',
                              padding: '4px 7px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                            title="Xóa vĩnh viễn tài khoản"
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

      {/* ─── MODAL 1: THÊM / SỬA TÀI KHOẢN ĐỘI XE ────────────────────────────── */}
      {showAccountModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '520px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              animation: 'scaleIn 0.2s ease-out'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1.2rem 1.5rem',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#f8fafc'
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
                  {editingAccount ? 'Cập Nhật Tài Khoản Đội Xe' : 'Thêm Mới Tài Khoản Đội Xe'}
                </h3>
                <p style={{ margin: '3px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                  {editingAccount
                    ? `Điều chỉnh thông tin nhân sự: ${editingAccount.name}`
                    : 'Cấp quyền đăng nhập hệ thống cho Tài xế hoặc Phụ xe'}
                </p>
              </div>
              <button
                onClick={() => setShowAccountModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveAccount} style={{ padding: '1.5rem' }}>
              {modalError && (
                <div
                  style={{
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#b91c1c',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span>{modalError}</span>
                </div>
              )}

              {/* Lựa chọn vai trò: Tài xế vs Phụ xe */}
              <div style={{ marginBottom: '1.1rem' }}>
                <label style={{ display: 'block', fontWeight: '700', fontSize: '0.8rem', color: '#1e293b', marginBottom: '6px' }}>
                  Vai trò tổ lái <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {/* Card Tài xế */}
                  <div
                    onClick={() => setFormRole('driver')}
                    style={{
                      border: `2px solid ${formRole === 'driver' ? '#16a34a' : '#e2e8f0'}`,
                      background: formRole === 'driver' ? '#f0fdf4' : '#ffffff',
                      borderRadius: '10px',
                      padding: '0.75rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        background: '#dcfce7',
                        color: '#15803d',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.82rem', color: '#0f172a' }}>Tài xế (Driver)</div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Lái xe &amp; điểm danh GPS</div>
                    </div>
                  </div>

                  {/* Card Phụ xe */}
                  <div
                    onClick={() => setFormRole('attendant')}
                    style={{
                      border: `2px solid ${formRole === 'attendant' ? '#db2777' : '#e2e8f0'}`,
                      background: formRole === 'attendant' ? '#fdf2f8' : '#ffffff',
                      borderRadius: '10px',
                      padding: '0.75rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        background: '#fce7f3',
                        color: '#be185d',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.82rem', color: '#0f172a' }}>Phụ xe (Attendant)</div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Soát vé &amp; đón trả khách</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Họ và tên */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: '700', fontSize: '0.8rem', color: '#1e293b', marginBottom: '4px' }}>
                  Họ và tên nhân viên <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn An"
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              {/* Số điện thoại (Tên đăng nhập) */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: '700', fontSize: '0.8rem', color: '#1e293b', marginBottom: '4px' }}>
                  Số điện thoại <span style={{ color: '#ef4444' }}>*</span>{' '}
                  <span style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: '500' }}>
                    (Dùng làm tài khoản đăng nhập)
                  </span>
                </label>
                <input
                  type="tel"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="Ví dụ: 0912345678"
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              {/* Email */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: '700', fontSize: '0.8rem', color: '#1e293b', marginBottom: '4px' }}>
                  Email liên hệ <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 'normal' }}>(Không bắt buộc)</span>
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="Ví dụ: taixe.anbinh@gmail.com"
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Mật khẩu */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: '700', fontSize: '0.8rem', color: '#1e293b', marginBottom: '4px' }}>
                  {editingAccount ? 'Đổi mật khẩu mới' : 'Mật khẩu khởi tạo'}{' '}
                  {!editingAccount ? (
                    <span style={{ color: '#ef4444' }}>*</span>
                  ) : (
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 'normal' }}>
                      (Để trống nếu giữ nguyên mật khẩu cũ)
                    </span>
                  )}
                </label>
                <input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder={editingAccount ? 'Nhập mật khẩu mới nếu muốn thay đổi' : 'Tối thiểu 6 ký tự (ví dụ: 123456)'}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box'
                  }}
                  required={!editingAccount}
                />
              </div>

              {/* Trạng thái tài khoản */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontWeight: '700', fontSize: '0.8rem', color: '#1e293b', marginBottom: '4px' }}>
                  Trạng thái hoạt động
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    background: '#ffffff',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="active">Đang hoạt động (Cho phép nhận ca &amp; điểm danh)</option>
                  <option value="suspended">Tạm khóa (Chặn đăng nhập)</option>
                  <option value="inactive">Tạm ngưng (Nghỉ việc / Tạm dừng dài hạn)</option>
                </select>
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAccountModal(false)}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#475569',
                    padding: '0.55rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  style={{
                    backgroundColor: '#2563eb',
                    border: 'none',
                    color: '#ffffff',
                    padding: '0.55rem 1.25rem',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
                  }}
                >
                  {modalSubmitting ? 'Đang lưu...' : editingAccount ? 'Lưu thay đổi' : 'Tạo tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: ĐỔI MẬT KHẨU NHANH ───────────────────────────────────────── */}
      {showPasswordModal && passwordTargetUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '420px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                padding: '1.2rem 1.4rem',
                borderBottom: '1px solid #e2e8f0',
                background: '#f8fafc',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#0f172a' }}>
                  Cấp Lại Mật Khẩu
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                  Nhân sự: <strong>{passwordTargetUser.name}</strong> ({passwordTargetUser.phone})
                </p>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <form onSubmit={handleSaveNewPassword} style={{ padding: '1.4rem' }}>
              {passwordError && (
                <div
                  style={{
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#b91c1c',
                    padding: '0.65rem 0.9rem',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span>{passwordError}</span>
                </div>
              )}

              <div style={{ marginBottom: '1.2rem' }}>
                <label style={{ display: 'block', fontWeight: '700', fontSize: '0.8rem', color: '#1e293b', marginBottom: '4px' }}>
                  Mật khẩu mới <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nhập ít nhất 6 ký tự"
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box'
                  }}
                  autoFocus
                  required
                />
                <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  Sau khi đổi, nhân viên sẽ dùng mật khẩu này để đăng nhập vào ứng dụng di động.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#475569',
                    padding: '0.5rem 0.9rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={passwordSubmitting}
                  style={{
                    backgroundColor: '#2563eb',
                    border: 'none',
                    color: '#ffffff',
                    padding: '0.5rem 1.1rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {passwordSubmitting ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: ĐĂNG KÝ SINH TRẮC FACE ID QUA WEBCAM ──────────────────────── */}
      {showFaceModal && faceTargetUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '560px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                padding: '1.2rem 1.5rem',
                borderBottom: '1px solid #e2e8f0',
                background: '#f8fafc',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
                  Đăng Ký Khuôn Mặt Face ID
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                  Nhân viên: <strong>{faceTargetUser.name}</strong> ({FLEET_ROLE_CONFIG[faceTargetUser.role]?.label || faceTargetUser.role} - {faceTargetUser.phone})
                </p>
              </div>
              <button
                onClick={closeFaceModal}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              {faceError && (
                <div
                  style={{
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#b91c1c',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span>{faceError}</span>
                </div>
              )}

              {/* Khung Webcam Camera */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '280px',
                  backgroundColor: '#0f172a',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <video
                  ref={faceVideoRef}
                  muted
                  playsInline
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: 'scaleX(-1)' // Gương phản chiếu tự nhiên
                  }}
                />
                <canvas
                  ref={faceCanvasRef}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none'
                  }}
                />

                {!faceCameraActive && (
                  <div style={{ position: 'absolute', color: '#94a3b8', textAlign: 'center', fontSize: '0.85rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px auto' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    </div>
                    Đang kích hoạt Camera và tải mô hình AI...
                  </div>
                )}
              </div>

              {/* Hướng dẫn và Danh sách mẫu đã chụp */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '1rem',
                  padding: '0.75rem 1rem',
                  background: '#f8fafc',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0'
                }}
              >
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.8rem', color: '#0f172a' }}>
                    Tiến độ chụp mẫu: {faceSamples.length}/3 mẫu
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                    Khuyên dùng: Chụp 3 góc nhìn (nhìn thẳng, hơi nghiêng trái, hơi nghiêng phải)
                  </div>
                </div>

                <button
                  type="button"
                  onClick={captureFaceSample}
                  disabled={!faceCameraActive || faceCapturing || faceSamples.length >= 3}
                  style={{
                    backgroundColor: faceSamples.length >= 3 ? '#94a3b8' : '#10b981',
                    border: 'none',
                    color: '#ffffff',
                    padding: '0.55rem 0.95rem',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    cursor: faceSamples.length >= 3 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 4px rgba(16, 185, 129, 0.25)'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  {faceCapturing ? 'Đang trích xuất...' : 'Chụp mẫu'}
                </button>
              </div>

              {/* Ảnh xem trước Face ID đã chụp */}
              {faceCapturedPhoto && (
                <div
                  style={{
                    marginTop: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: '#f8fafc',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0'
                  }}
                >
                  <img
                    src={faceCapturedPhoto}
                    alt="Snapshot preview"
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '8px',
                      objectFit: 'cover',
                      border: '2px solid #10b981',
                      flexShrink: 0
                    }}
                  />
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#0f172a' }}>
                      Ảnh mẫu Face ID sẽ lưu
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      Ảnh này sẽ được lưu vào tài khoản để quản lý có thể đối soát và xem trực tiếp bất kỳ lúc nào.
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={closeFaceModal}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#475569',
                    padding: '0.55rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={saveFaceRegistration}
                  disabled={faceSamples.length === 0 || faceSubmitting}
                  style={{
                    backgroundColor: faceSamples.length === 0 ? '#cbd5e1' : '#2563eb',
                    border: 'none',
                    color: '#ffffff',
                    padding: '0.55rem 1.25rem',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: '700',
                    cursor: faceSamples.length === 0 ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
                  }}
                >
                  {faceSubmitting ? 'Đang lưu mẫu khuôn mặt...' : 'Hoàn tất & Lưu Face ID'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 4: XÁC NHẬN (CONFIRM MODAL) ─────────────────────────────────── */}
      {confirmModal.show && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '1rem'
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '440px',
              padding: '1.5rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
              {confirmModal.title}
            </h3>
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.82rem', color: '#475569', lineHeight: '1.45' }}>
              {confirmModal.message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setConfirmModal((prev) => ({ ...prev, show: false }))}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  padding: '0.5rem 0.95rem',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                style={{
                  backgroundColor: confirmModal.confirmColor || '#2563eb',
                  border: 'none',
                  color: '#ffffff',
                  padding: '0.5rem 1.15rem',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 5: XEM ẢNH KHUÔN MẶT ĐÃ ĐĂNG KÝ FACE ID ───────────────────── */}
      {previewPhotoStaff && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '1rem'
          }}
          onClick={() => setPreviewPhotoStaff(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '440px',
              padding: '1.5rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              textAlign: 'center',
              animation: 'scaleIn 0.2s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ textAlign: 'left' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
                  Ảnh Mẫu Face ID
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                  {previewPhotoStaff.name} ({FLEET_ROLE_CONFIG[previewPhotoStaff.role]?.label || previewPhotoStaff.role} - {previewPhotoStaff.phone})
                </p>
              </div>
              <button
                onClick={() => setPreviewPhotoStaff(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {previewPhotoStaff.facePhoto ? (
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: '1rem' }}>
                <img
                  src={previewPhotoStaff.facePhoto}
                  alt={previewPhotoStaff.name}
                  style={{
                    width: '280px',
                    height: '280px',
                    objectFit: 'cover',
                    borderRadius: '14px',
                    border: '3px solid #10b981',
                    boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.25)'
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: '12px',
                    right: '12px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    color: '#ffffff',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '0.7rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  Hồ sơ AI đối soát
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: '2.5rem 1rem',
                  background: '#f8fafc',
                  borderRadius: '12px',
                  border: '1px dashed #cbd5e1',
                  marginBottom: '1rem',
                  color: '#64748b'
                }}
              >
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px auto', color: '#64748b' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '0.85rem' }}>
                  Chưa có ảnh chụp lưu trữ
                </div>
                <div style={{ fontSize: '0.75rem', marginTop: '4px', maxWidth: '320px', margin: '4px auto 0 auto', lineHeight: '1.4' }}>
                  Tài khoản này đã có vector AI nhưng chưa lưu ảnh snapshot. Bấm nút bên dưới để quét camera và cập nhật ảnh khuôn mặt.
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setPreviewPhotoStaff(null)}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = previewPhotoStaff;
                  setPreviewPhotoStaff(null);
                  openFaceModal(target);
                }}
                style={{
                  backgroundColor: '#2563eb',
                  border: 'none',
                  color: '#ffffff',
                  padding: '0.5rem 1.15rem',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                Cập nhật / Chụp lại ảnh mới
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpsFleetAccountsPage;
