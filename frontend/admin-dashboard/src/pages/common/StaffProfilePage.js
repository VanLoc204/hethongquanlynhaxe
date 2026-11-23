import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import AutoFaceEnrollModal from '../../components/AutoFaceEnrollModal';

const API_BASE = 'http://localhost:8000/api';

// Clean SVG Icons for 2FA Password Change matching Customer App
const IconKey = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7.5" cy="15.5" r="5.5" /><path d="m21 2-9.6 9.6" /><path d="m15.5 7.5 3 3L22 7l-3-3" />
  </svg>
);

const IconLock = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const IconEye = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
  </svg>
);

const IconEyeOff = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" y1="2" x2="22" y2="22" />
  </svg>
);

const IconShieldCheck = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" />
  </svg>
);

const IconClock = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconClose = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const ROLE_LABELS = {
  fleet_manager: 'Quản lý Xe',
  ops_manager: 'Quản lý Vận tải',
  general_manager: 'Ban Giám đốc',
  admin: 'Quản trị viên',
  ticket_manager: 'Quản lý Phòng vé',
  ticket_agent: 'Nhân viên bán vé',
  driver: 'Tài xế',
  attendant: 'Phụ xe',
  customer: 'Khách hàng'
};

const ROLE_DEPARTMENTS = {
  fleet_manager: 'Khối Kỹ thuật - Quản lý Xe & Bảo dưỡng',
  ops_manager: 'Khối Điều hành - Điều độ Tuyến & Lộ trình',
  general_manager: 'Ban Tổng Giám Đốc - Điều hành Toàn hệ thống',
  admin: 'Ban Công Nghệ Thông Tin - Quản trị Hệ thống & Bảo mật',
  ticket_manager: 'Khối Quản trị - Ban Quản lý Phòng vé & Doanh thu',
  ticket_agent: 'Khối Thương mại - Quầy vé trực tiếp',
  driver: 'Khối Vận hành - Đội ngũ Tài xế đường dài',
  attendant: 'Khối Dịch vụ - Đội ngũ Tiếp viên chăm sóc khách hàng',
  customer: 'Khách hàng thành viên'
};

const StaffProfilePage = () => {
  const { user, token, updateUser } = useContext(AuthContext);

  // Form Thông tin cá nhân
  const [name, setName] = useState(user?.name || user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileErrors, setProfileErrors] = useState({});
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });

  // Form Đổi mật khẩu (Đồng bộ chuẩn 100% Khách hàng: 2 trường + toggle mắt riêng)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passErrors, setPassErrors] = useState({});
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });

  // Modal OTP Xác thực 2FA Đổi Mật Khẩu
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [changePassOtp, setChangePassOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [emailSentStatus, setEmailSentStatus] = useState(true);
  const [otpTimer, setOtpTimer] = useState(180);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState('');

  // Modal Đăng ký Sinh trắc học Face ID (3 Góc Mặt Tự Động)
  const [showFaceEnrollModal, setShowFaceEnrollModal] = useState(false);
  const [faceRegistered, setFaceRegistered] = useState(Boolean(user?.faceRegistered));

  useEffect(() => {
    if (!token) return;
    let isMounted = true;
    fetch(`${API_BASE}/attendance/mine?limit=1`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (isMounted && data.success) {
          setFaceRegistered(Boolean(data.faceRegistered));
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, [token]);

  useEffect(() => {
    if (user) {
      setName(user.name || user.fullName || '');
      setEmail(user.email || '');
    }
  }, [user]);

  // Bộ đếm ngược 180s cho OTP
  useEffect(() => {
    let interval = null;
    if (showOtpModal && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    } else if (otpTimer === 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [showOtpModal, otpTimer]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Cập nhật thông tin cá nhân (Họ tên, Email) với validation trực tiếp trên từng trường
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileMessage({ type: '', text: '' });
    setProfileErrors({});

    const errs = {};
    const trimmedName = (name || '').trim();
    const trimmedEmail = (email || '').trim();

    if (!trimmedName) {
      errs.name = 'Vui lòng nhập họ và tên.';
    } else if (trimmedName.length < 2) {
      errs.name = 'Họ và tên tối thiểu 2 ký tự.';
    } else if (trimmedName.length > 50) {
      errs.name = 'Họ và tên không được vượt quá 50 ký tự.';
    } else if (!/^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăạảấầẩẫậắằẳẵặẹẻẽềềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵỷỹ\s]+$/.test(trimmedName)) {
      errs.name = 'Họ và tên chỉ được chứa chữ cái tiếng Việt hoặc tiếng Anh.';
    }

    if (!trimmedEmail) {
      errs.email = 'Vui lòng nhập email làm việc.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errs.email = 'Email không đúng định dạng (ví dụ: name@anbinhlines.vn).';
    }

    if (Object.keys(errs).length > 0) {
      setProfileErrors(errs);
      return;
    }

    setProfileLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/updatedetails`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: trimmedName, email: trimmedEmail })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProfileMessage({ type: 'success', text: 'Cập nhật thông tin cá nhân thành công!' });
        if (data.user) {
          if (updateUser) {
            updateUser(data.user);
          } else {
            localStorage.setItem('admin_user', JSON.stringify(data.user));
          }
        }
        setTimeout(() => setProfileMessage({ type: '', text: '' }), 4000);
      } else {
        const msg = data.message || 'Cập nhật thông tin thất bại.';
        const lower = msg.toLowerCase();
        if (lower.includes('email')) {
          setProfileErrors({ email: msg });
        } else if (lower.includes('họ và tên') || lower.includes('tên')) {
          setProfileErrors({ name: msg });
        } else {
          setProfileMessage({ type: 'error', text: msg });
        }
      }
    } catch (err) {
      setProfileMessage({ type: 'error', text: 'Lỗi kết nối máy chủ.' });
    } finally {
      setProfileLoading(false);
    }
  };

  // Bước 1: Kiểm tra mật khẩu & Gửi mã OTP xác thực 2FA qua Email (đồng bộ chuẩn 100% Khách hàng)
  const handleRequestChangePasswordOtp = async (e) => {
    e.preventDefault();
    setPasswordMessage({ type: '', text: '' });
    setPassErrors({});
    setOtpError('');

    const errs = {};
    const trimmedCurrent = (currentPassword || '').trim();
    const trimmedNew = (newPassword || '').trim();

    if (!trimmedCurrent) {
      errs.currentPassword = 'Vui lòng nhập mật khẩu hiện tại.';
    }

    if (!trimmedNew) {
      errs.newPassword = 'Vui lòng nhập mật khẩu mới.';
    } else if (trimmedNew.length < 8) {
      errs.newPassword = 'Mật khẩu mới tối thiểu 8 ký tự.';
    } else if (trimmedCurrent && trimmedNew === trimmedCurrent) {
      errs.newPassword = 'Mật khẩu mới không được trùng mật khẩu cũ.';
    }

    if (Object.keys(errs).length > 0) {
      setPassErrors(errs);
      return;
    }

    if (!user?.email && !email) {
      setPasswordMessage({ type: 'error', text: 'Tài khoản chưa cập nhật email để nhận mã OTP 2FA.' });
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await fetch(`${API_BASE}/auth/changepassword/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword: trimmedCurrent, newPassword: trimmedNew })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOtpTimer(180);
        setChangePassOtp('');
        setOtpError('');
        setDevOtp(data.otp || '');
        setEmailSentStatus(data.emailSent !== false);
        setShowOtpModal(true);
      } else {
        const msg = data.message || 'Không thể gửi mã xác thực OTP.';
        const lower = msg.toLowerCase();
        if (lower.includes('hiện tại')) {
          setPassErrors({ currentPassword: msg });
        } else if (lower.includes('mật khẩu') || lower.includes('ký tự') || lower.includes('trùng')) {
          setPassErrors({ newPassword: msg });
        } else {
          setPasswordMessage({ type: 'error', text: msg });
        }
      }
    } catch (err) {
      setPasswordMessage({ type: 'error', text: 'Lỗi kết nối máy chủ khi gửi OTP.' });
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Gửi lại mã OTP trong Modal (đồng bộ chuẩn 100% Khách hàng)
  const handleResendOtp = async () => {
    if (otpTimer > 0 || isSendingOtp) return;
    setIsSendingOtp(true);
    setOtpError('');
    try {
      const res = await fetch(`${API_BASE}/auth/changepassword/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword: currentPassword.trim(), newPassword: newPassword.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOtpTimer(180);
        setChangePassOtp('');
        setDevOtp(data.otp || '');
        setEmailSentStatus(data.emailSent !== false);
      } else {
        setOtpError(data.message || 'Không thể gửi lại mã xác thực.');
      }
    } catch (err) {
      setOtpError('Lỗi kết nối khi gửi lại OTP.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Bước 2: Xác thực mã OTP và cập nhật mật khẩu mới (đồng bộ chuẩn 100% Khách hàng)
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setOtpError('');

    const cleanOtp = (changePassOtp || '').trim();
    if (!cleanOtp) {
      setOtpError('Vui lòng nhập mã xác thực OTP.');
      return;
    }
    if (cleanOtp.length !== 6) {
      setOtpError('Mã xác thực phải gồm đúng 6 chữ số.');
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const res = await fetch(`${API_BASE}/auth/changepassword/verify-and-update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ otp: cleanOtp })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowOtpModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setChangePassOtp('');
        setPassErrors({});
        setPasswordMessage({ type: 'success', text: 'Đổi mật khẩu thành công.' });
        setTimeout(() => setPasswordMessage({ type: '', text: '' }), 4000);
      } else {
        setOtpError(data.message || 'Mã xác thực không chính xác hoặc đã hết hạn.');
      }
    } catch (err) {
      setOtpError('Lỗi kết nối máy chủ khi xác thực OTP.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const branchName = user?.branch?.branchName || (user?.branch?.branchId === 'dl' ? 'Chi nhánh Đà Lạt' : user?.branch?.branchId === 'ct' ? 'Chi nhánh Cần Thơ' : 'Chi nhánh TP. Hồ Chí Minh');
  const roleName = ROLE_LABELS[user?.role] || user?.role || 'Nhân viên';

  return (
    <div style={{ animation: 'fadeIn 0.25s ease', display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
      
      {/* 1. Header Card Chuẩn Quản Trị (Mẫu giao diện thống nhất toàn hệ thống, tràn đều 100%) */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '1.25rem 1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Avatar Đại Diện */}
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            backgroundColor: '#eff6ff',
            color: '#2563eb',
            border: '2px solid #bfdbfe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
            fontWeight: '800',
            flexShrink: 0
          }}>
            {user?.name ? user.name.trim().split(' ').slice(-1)[0].substring(0, 2).toUpperCase() : 'AB'}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#0f172a' }}>
                {user?.name || user?.fullName || 'Hồ sơ nhân sự'}
              </h1>
              {user?.employeeCode && (
                <span style={{
                  background: '#f8fafc',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  fontWeight: '700'
                }}>
                  {user.employeeCode}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '0.78rem', color: '#64748b', flexWrap: 'wrap' }}>
              <span style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '1px 7px', borderRadius: '4px', fontWeight: '700' }}>
                {roleName}
              </span>
              <span style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', padding: '1px 7px', borderRadius: '4px', fontWeight: '700' }}>
                {branchName}
              </span>
              <span style={{
                background: faceRegistered ? '#ecfdf5' : '#fffbeb',
                color: faceRegistered ? '#047857' : '#b45309',
                border: `1px solid ${faceRegistered ? '#a7f3d0' : '#fde68a'}`,
                padding: '1px 7px',
                borderRadius: '4px',
                fontWeight: '700'
              }}>
                {faceRegistered ? 'Đã kích hoạt Face ID' : 'Chưa kích hoạt Face ID'}
              </span>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#64748b' }}>
          <div>Hệ thống Quản lý Vận tải An Bình Lines</div>
          <div style={{ marginTop: '2px', color: '#0f172a', fontWeight: '600' }}>
            Trạng thái: <span style={{ color: '#16a34a' }}>Đang hoạt động</span>
          </div>
        </div>
      </div>

      {/* 2. Grid 2 Cột: Thông tin phân công & Thông tin cá nhân (Tràn viền 100% không để trống 2 bên) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.25rem', width: '100%', boxSizing: 'border-box' }}>
        
        {/* KHỐI 1: THÔNG TIN CÔNG TÁC & PHÂN CÔNG (ĐÃ XÓA QUẦY VÉ HOÀN TOÀN) */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '1.25rem 1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          boxSizing: 'border-box'
        }}>
          <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
            <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: '#0f172a' }}>
              Thông tin công tác & phân công
            </h2>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
              Thông tin phân công nhiệm vụ và đơn vị trực thuộc
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.45rem 0', borderBottom: '1px dashed #f1f5f9' }}>
              <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Chi nhánh trực thuộc</span>
              <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#1e3a8a' }}>{branchName}</span>
            </div>

            {user?.assignedOffice && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.45rem 0', borderBottom: '1px dashed #f1f5f9' }}>
                <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Văn phòng làm việc</span>
                <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#0f172a' }}>{user.assignedOffice}</span>
              </div>
            )}

            {user?.shiftName ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.45rem 0', borderBottom: '1px dashed #f1f5f9' }}>
                <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Khung giờ làm việc</span>
                <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: '4px' }}>
                  {user.shiftName}
                </span>
              </div>
            ) : ['driver', 'attendant'].includes(user?.role) ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.45rem 0', borderBottom: '1px dashed #f1f5f9' }}>
                <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Hình thức trực</span>
                <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#0284c7', background: '#e0f2fe', padding: '2px 8px', borderRadius: '4px' }}>
                  Theo biểu đồ chạy xe
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.45rem 0', borderBottom: '1px dashed #f1f5f9' }}>
                <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Chế độ làm việc</span>
                <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>
                  Toàn thời gian (Full-time)
                </span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.45rem 0', flexWrap: 'wrap', gap: '6px' }}>
              <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Sinh trắc học Face ID</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: faceRegistered ? '#ecfdf5' : '#fffbeb',
                  color: faceRegistered ? '#047857' : '#b45309',
                  border: `1px solid ${faceRegistered ? '#a7f3d0' : '#fde68a'}`
                }}>
                  {faceRegistered ? 'Đã đăng ký sinh trắc học' : 'Chưa đăng ký Face ID'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowFaceEnrollModal(true)}
                  style={{
                    background: faceRegistered ? '#ffffff' : '#2563eb',
                    color: faceRegistered ? '#2563eb' : '#ffffff',
                    border: '1px solid #2563eb',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {faceRegistered ? 'Quét lại Face ID' : 'Đăng ký 3 góc mặt'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* KHỐI 2: THÔNG TIN LIÊN HỆ & CẬP NHẬT */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '1.25rem 1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          boxSizing: 'border-box'
        }}>
          <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
            <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: '#0f172a' }}>
              Thông tin liên hệ & cá nhân
            </h2>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
              Cập nhật họ tên và email làm việc nhận thông báo vận hành
            </div>
          </div>

          {profileMessage.text && (
            <div style={{
              padding: '0.65rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: '600',
              background: profileMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
              color: profileMessage.type === 'success' ? '#166534' : '#991b1b',
              border: `1px solid ${profileMessage.type === 'success' ? '#bbf7d0' : '#fecaca'}`
            }}>
              {profileMessage.text}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Số điện thoại đăng nhập
              </label>
              <input
                type="text"
                value={user?.phone || ''}
                disabled
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  color: '#64748b',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  cursor: 'not-allowed',
                  boxSizing: 'border-box'
                }}
              />
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px', display: 'block' }}>
                Số điện thoại là định danh tài khoản công vụ, không thể tự chỉnh sửa.
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Họ và tên *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (profileErrors.name) setProfileErrors((prev) => ({ ...prev, name: '' }));
                }}
                placeholder="Nhập họ và tên đầy đủ"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '8px',
                  border: profileErrors.name ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                  backgroundColor: profileErrors.name ? '#fff5f5' : '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s, background-color 0.15s'
                }}
              />
              {profileErrors.name && (
                <div style={{ color: '#dc2626', fontSize: '0.74rem', marginTop: '4px', fontWeight: '600' }}>
                  {profileErrors.name}
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Email làm việc *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (profileErrors.email) setProfileErrors((prev) => ({ ...prev, email: '' }));
                }}
                placeholder="name@anbinhlines.vn"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '8px',
                  border: profileErrors.email ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                  backgroundColor: profileErrors.email ? '#fff5f5' : '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s, background-color 0.15s'
                }}
              />
              {profileErrors.email && (
                <div style={{ color: '#dc2626', fontSize: '0.74rem', marginTop: '4px', fontWeight: '600' }}>
                  {profileErrors.email}
                </div>
              )}
            </div>

            <div style={{ marginTop: '0.4rem' }}>
              <button
                type="submit"
                disabled={profileLoading}
                style={{
                  backgroundColor: '#2563eb',
                  border: 'none',
                  color: '#ffffff',
                  padding: '0.6rem 1.4rem',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  cursor: profileLoading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  transition: 'background-color 0.2s'
                }}
              >
                {profileLoading ? 'Đang lưu...' : 'Lưu Thay Đổi Thông Tin'}
              </button>
            </div>
          </form>
        </div>

      </div>

      {/* 3. KHỐI ĐỔI MẬT KHẨU TÀI KHOẢN (ĐỒNG BỘ 100% VỚI QUY TRÌNH & GIAO DIỆN KHÁCH HÀNG) */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '1.25rem 1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
          <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: '#0f172a' }}>
            Đổi mật khẩu tài khoản
          </h2>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
            Mật khẩu công vụ được bảo vệ bằng mã xác thực OTP 2FA gửi về hộp thư điện tử của bạn
          </div>
        </div>

        {passwordMessage.text && (
          <div style={{
            padding: '0.65rem 0.85rem',
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontWeight: '600',
            background: passwordMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
            color: passwordMessage.type === 'success' ? '#166534' : '#991b1b',
            border: `1px solid ${passwordMessage.type === 'success' ? '#bbf7d0' : '#fecaca'}`
          }}>
            {passwordMessage.text}
          </div>
        )}

        <form onSubmit={handleRequestChangePasswordOtp} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', width: '100%' }}>
            
            {/* Trường 1: Mật khẩu hiện tại */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Mật khẩu hiện tại *
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                  <IconKey />
                </span>
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    if (passErrors.currentPassword) setPassErrors(prev => ({ ...prev, currentPassword: '' }));
                  }}
                  style={{
                    width: '100%',
                    padding: '0.6rem 2.4rem 0.6rem 2.4rem',
                    fontSize: '0.82rem',
                    fontWeight: '600',
                    color: '#0f172a',
                    border: passErrors.currentPassword ? '1px solid #dc2626' : '1px solid #cbd5e1',
                    backgroundColor: passErrors.currentPassword ? '#fff5f5' : '#ffffff',
                    borderRadius: '8px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showCurrentPass ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
              {passErrors.currentPassword && (
                <div style={{ color: '#dc2626', fontSize: '0.74rem', marginTop: '4px', fontWeight: '600' }}>
                  {passErrors.currentPassword}
                </div>
              )}
            </div>

            {/* Trường 2: Mật khẩu mới (Tối thiểu 8 ký tự) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Mật khẩu mới * (tối thiểu 8 ký tự)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                  <IconLock />
                </span>
                <input
                  type={showNewPass ? 'text' : 'password'}
                  placeholder="Tối thiểu 8 ký tự"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (passErrors.newPassword) setPassErrors(prev => ({ ...prev, newPassword: '' }));
                  }}
                  style={{
                    width: '100%',
                    padding: '0.6rem 2.4rem 0.6rem 2.4rem',
                    fontSize: '0.82rem',
                    fontWeight: '600',
                    color: '#0f172a',
                    border: passErrors.newPassword ? '1px solid #dc2626' : '1px solid #cbd5e1',
                    backgroundColor: passErrors.newPassword ? '#fff5f5' : '#ffffff',
                    borderRadius: '8px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showNewPass ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
              {passErrors.newPassword && (
                <div style={{ color: '#dc2626', fontSize: '0.74rem', marginTop: '4px', fontWeight: '600' }}>
                  {passErrors.newPassword}
                </div>
              )}
            </div>

          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '0.2rem' }}>
            <button
              type="submit"
              disabled={isSendingOtp}
              style={{
                backgroundColor: '#2563eb',
                border: 'none',
                color: '#ffffff',
                padding: '0.6rem 1.4rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: '700',
                cursor: isSendingOtp ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                transition: 'background-color 0.2s'
              }}
            >
              {isSendingOtp ? 'Đang gửi mã...' : 'Cập nhật mật khẩu'}
            </button>
          </div>
        </form>
      </div>

      {/* 4. MODAL XÁC THỰC MÃ OTP ĐỔI MẬT KHẨU (2FA) - ĐỒNG BỘ 100% VỚI KHÁCH HÀNG */}
      {showOtpModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '430px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2), 0 10px 10px -5px rgba(0,0,0,0.04)',
            overflow: 'hidden',
            border: '1px solid #e2e8f0',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '14px 18px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <div style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '8px',
                  background: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <IconShieldCheck />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: '800', color: '#0f172a' }}>
                    Xác Thực Đổi Mật Khẩu (2FA)
                  </h3>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Bảo vệ an toàn tài khoản An Bình Lines
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOtpModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <IconClose />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleVerifyOtp} style={{ padding: '18px 20px' }}>
              <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                <p style={{ fontSize: '0.82rem', color: '#475569', margin: '0 0 4px 0', lineHeight: '1.5' }}>
                  {emailSentStatus ? 'Mã xác thực 6 số đã được gửi đến email:' : 'Đã tạo mã xác thực OTP cho tài khoản:'}
                </p>
                <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#1e293b' }}>
                  {user?.email || email || 'email làm việc'}
                </div>
              </div>

              {/* Thông báo hỗ trợ kiểm thử nếu IP mạng chưa whitelist trên Brevo */}
              {!emailSentStatus && devOtp && (
                <div style={{
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  marginBottom: '14px',
                  fontSize: '0.74rem',
                  color: '#92400e',
                  textAlign: 'center'
                }}>
                  <div style={{ fontWeight: '700', marginBottom: '4px' }}>
                    Email chưa gửi tới hộp thư do IP mạng chưa thêm vào whitelist của Brevo
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '6px' }}>
                    <span>Mã OTP của bạn:</span>
                    <code style={{ fontSize: '1.05rem', fontWeight: '800', color: '#b45309', background: '#fef3c7', padding: '2px 8px', borderRadius: '4px', letterSpacing: '2px' }}>
                      {devOtp}
                    </code>
                    <button
                      type="button"
                      onClick={() => setChangePassOtp(devOtp)}
                      style={{
                        background: '#d97706',
                        color: '#ffffff',
                        border: 'none',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontWeight: '700',
                        fontSize: '0.7rem',
                        cursor: 'pointer'
                      }}
                    >
                      Điền mã ngay
                    </button>
                  </div>
                </div>
              )}

              {/* Ô Nhập Mã OTP 6 Số Căn Giữa To Rõ */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#334155', marginBottom: '6px', textAlign: 'center' }}>
                  Nhập mã OTP 6 chữ số
                </label>
                <input
                  type="text"
                  maxLength="6"
                  autoFocus
                  placeholder="------"
                  value={changePassOtp}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setChangePassOtp(val);
                    if (otpError) setOtpError('');
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '1.4rem',
                    fontWeight: '800',
                    letterSpacing: '8px',
                    textAlign: 'center',
                    borderRadius: '8px',
                    border: otpError ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                    backgroundColor: otpError ? '#fff5f5' : '#f8fafc',
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                {otpError && (
                  <div style={{ color: '#dc2626', fontSize: '0.74rem', marginTop: '6px', textAlign: 'center', fontWeight: '600' }}>
                    {otpError}
                  </div>
                )}
              </div>

              {/* Đồng Hồ Đếm Ngược & Gửi Lại Mã */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                marginBottom: '18px',
                fontSize: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: otpTimer > 0 ? '#d97706' : '#dc2626', fontWeight: '600' }}>
                  <IconClock />
                  <span>Hiệu lực: {formatTimer(otpTimer)}</span>
                </div>
                <button
                  type="button"
                  disabled={otpTimer > 0 || isSendingOtp}
                  onClick={handleResendOtp}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: otpTimer > 0 ? '#94a3b8' : '#2563eb',
                    fontWeight: '700',
                    cursor: otpTimer > 0 ? 'not-allowed' : 'pointer',
                    fontSize: '0.74rem',
                    textDecoration: otpTimer > 0 ? 'none' : 'underline'
                  }}
                >
                  {isSendingOtp ? 'Đang gửi lại...' : 'Gửi lại mã'}
                </button>
              </div>

              {/* Các Nút Thao Tác Trong Modal */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowOtpModal(false)}
                  style={{
                    flex: 1,
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontWeight: '700',
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isVerifyingOtp || changePassOtp.length !== 6}
                  style={{
                    flex: 1,
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: changePassOtp.length === 6 && !isVerifyingOtp ? '#2563eb' : '#94a3b8',
                    color: '#ffffff',
                    fontWeight: '700',
                    fontSize: '0.8rem',
                    cursor: changePassOtp.length === 6 && !isVerifyingOtp ? 'pointer' : 'not-allowed',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}
                >
                  {isVerifyingOtp ? 'Đang xác thực...' : 'Xác nhận đổi mật khẩu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL ĐĂNG KÝ SINH TRẮC HỌC FACE ID 3 GÓC MẶT TỰ ĐỘNG */}
      <AutoFaceEnrollModal
        isOpen={showFaceEnrollModal}
        onClose={() => setShowFaceEnrollModal(false)}
        onSuccess={(result) => {
          setFaceRegistered(true);
          const updatedUser = {
            ...user,
            faceRegistered: true,
            faceIdEnrolled: true,
            facePhoto: result.facePhoto || user?.facePhoto
          };
          if (updateUser) {
            updateUser(updatedUser);
          } else {
            localStorage.setItem('admin_user', JSON.stringify(updatedUser));
          }
          setProfileMessage({
            type: 'success',
            text: 'Đã kích hoạt sinh trắc học Face ID (3 góc mặt) thành công!'
          });
          setTimeout(() => setProfileMessage({ type: '', text: '' }), 4000);
        }}
        token={token}
        userId={user?._id || user?.id}
        userName={user?.name || user?.fullName}
      />

    </div>
  );
};

export default StaffProfilePage;
