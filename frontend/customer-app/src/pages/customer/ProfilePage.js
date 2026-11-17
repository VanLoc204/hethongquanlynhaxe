import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { 
  User, 
  Phone, 
  Mail, 
  Lock, 
  Key, 
  KeyRound,
  Clock,
  X,
  ArrowRight,
  Eye, 
  EyeOff, 
  Star, 
  ShieldCheck, 
  CheckCircle2, 
  Tag, 
  Copy, 
  Percent, 
  Sliders, 
  Check, 
  Save, 
  Gift,
  Coins,
  Ticket
} from 'lucide-react';

const ProfilePage = () => {
  const { 
    user, 
    updateProfile, 
    changePassword, 
    sendChangePasswordOtp, 
    verifyAndChangePassword, 
    loading 
  } = useContext(AuthContext);

  // Profile fields state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  
  // Password change fields state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  // Status/alerts state
  const [infoMessage, setInfoMessage] = useState({ text: '', type: '' });
  const [passMessage, setPassMessage] = useState({ text: '', type: '' });
  const [profileErrors, setProfileErrors] = useState({});
  const [passErrors, setPassErrors] = useState({});
  const [copiedCode, setCopiedCode] = useState('');
  const [promoInput, setPromoInput] = useState('');
  const [promoAlert, setPromoAlert] = useState('');

  // 2FA OTP Modal State for Password Change
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [changePassOtp, setChangePassOtp] = useState('');
  const [otpTimer, setOtpTimer] = useState(180);
  const [otpError, setOtpError] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  // Đếm ngược 3 phút (180 giây) cho OTP
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
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#475569' }}>
        <h3 style={{ fontWeight: '700', fontSize: '1.25rem', marginBottom: '8px' }}>
          Vui lòng đăng nhập để xem thông tin tài khoản
        </h3>
        <p style={{ fontSize: '0.9rem' }}>Đăng nhập để xem hạng thành viên, ưu đãi độc quyền và điểm tích lũy.</p>
      </div>
    );
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setInfoMessage({ text: '', type: '' });
    setProfileErrors({});

    const errs = {};
    const trimmedName = (name || '').trim();
    const trimmedEmail = (email || '').trim();

    if (!trimmedName) {
      errs.name = 'Vui lòng nhập họ và tên.';
    } else if (trimmedName.length < 2) {
      errs.name = 'Họ và tên tối thiểu 2 ký tự.';
    } else if (trimmedName.length > 50) {
      errs.name = 'Họ và tên không quá 50 ký tự.';
    } else if (!/^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăạảấầẩẫậắằẳẵặẹẻẽềềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵỷỹ\s]+$/.test(trimmedName)) {
      errs.name = 'Họ và tên chỉ được chứa chữ cái.';
    }

    if (!trimmedEmail) {
      errs.email = 'Vui lòng nhập địa chỉ email.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errs.email = 'Email không đúng định dạng.';
    }

    if (Object.keys(errs).length > 0) {
      setProfileErrors(errs);
      return;
    }

    const res = await updateProfile(trimmedName, trimmedEmail);
    if (res.success) {
      setInfoMessage({ text: 'Cập nhật thông tin thành công.', type: 'success' });
      setTimeout(() => setInfoMessage({ text: '', type: '' }), 4000);
    } else {
      setInfoMessage({ text: res.message || 'Cập nhật thất bại.', type: 'error' });
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassMessage({ text: '', type: '' });
    setPassErrors({});

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

    if (!user?.email) {
      setPassMessage({ text: 'Tài khoản chưa cập nhật email để nhận mã OTP 2FA.', type: 'error' });
      return;
    }

    // Gửi OTP xác thực 2FA đến email của người dùng
    setIsSendingOtp(true);
    const res = await sendChangePasswordOtp(trimmedCurrent, trimmedNew);
    setIsSendingOtp(false);

    if (res.success) {
      setOtpTimer(180);
      setChangePassOtp('');
      setOtpError('');
      setShowOtpModal(true);
    } else {
      const msg = res.message || 'Không thể gửi mã xác thực.';
      const lower = msg.toLowerCase();
      if (lower.includes('hiện tại')) {
        setPassErrors({ currentPassword: msg });
      } else if (lower.includes('mật khẩu') || lower.includes('ký tự') || lower.includes('chữ')) {
        setPassErrors({ newPassword: msg });
      } else {
        setPassMessage({ text: msg, type: 'error' });
      }
    }
  };

  // Gửi lại mã OTP
  const handleResendChangePassOtp = async () => {
    if (otpTimer > 0 || isSendingOtp) return;
    setOtpError('');
    setIsSendingOtp(true);
    const res = await sendChangePasswordOtp(currentPassword, newPassword);
    setIsSendingOtp(false);
    if (res.success) {
      setOtpTimer(180);
    } else {
      setOtpError(res.message || 'Không thể gửi lại mã xác thực.');
    }
  };

  // Xác thực OTP và cập nhật mật khẩu mới
  const handleVerifyChangePassOtp = async (e) => {
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
    const res = await verifyAndChangePassword(cleanOtp);
    setIsVerifyingOtp(false);

    if (res.success) {
      setShowOtpModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setChangePassOtp('');
      setPassMessage({ text: 'Đổi mật khẩu thành công.', type: 'success' });
      setTimeout(() => setPassMessage({ text: '', type: '' }), 4000);
    } else {
      setOtpError(res.message || 'Mã xác thực không chính xác.');
    }
  };

  const handleCopyCode = (code) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(code);
    }
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 3000);
  };

  const handleApplyNewPromo = (e) => {
    e.preventDefault();
    if (!promoInput.trim()) return;
    setPromoAlert(`Mã "${promoInput.toUpperCase().trim()}" đã được lưu vào danh sách của bạn!`);
    setPromoInput('');
    setTimeout(() => setPromoAlert(''), 4000);
  };

  // Xác định cấu hình bậc hạng (Chỉ chứa đặc quyền Voucher & Điểm thưởng)
  const getTierConfig = (tier) => {
    const t = String(tier || '').toLowerCase();
    if (t.includes('plat') || t.includes('bạch kim')) {
      return {
        key: 'platinum',
        displayName: 'Hạng Bạch Kim',
        shortBadge: 'Bạch Kim',
        badgeBg: '#fef3c7',
        badgeColor: '#b45309',
        badgeBorder: '#fde68a',
        cardBg: 'linear-gradient(135deg, #0b2246 0%, #163769 50%, #0e274f 100%)',
        starBg: 'rgba(245, 158, 11, 0.2)',
        starBorder: '#f59e0b',
        starColor: '#fbbf24',
        progressPercent: '100%',
        progressText: 'Tối đa (100%)',
        isMaxTier: true,
        benefitsTitle: 'Đặc Quyền Voucher Hạng Bạch Kim',
        benefits: [
          {
            title: 'Voucher Giảm 15% Vé VIP (BACHKIM15)',
            desc: 'Chiết khấu trực tiếp 15% (tối đa 100.000đ) cho mọi chuyến xe trên toàn hệ thống.'
          },
          {
            title: 'Voucher Tri Ân Khách Hàng VIP 100K (TRIANVIP)',
            desc: 'Tặng voucher 100.000đ cho đơn đặt vé từ 200.000đ dành riêng cho thành viên VIP.'
          },
          {
            title: 'Voucher Đặt Vé Khứ Hồi 50K (ANBINH50K)',
            desc: 'Áp dụng giảm ngay 50.000đ khi đặt vé xe khứ hồi từ 400.000đ trở lên.'
          },
          {
            title: 'Tích Lũy 5% Điểm Thưởng Mỗi Chuyến Đi',
            desc: 'Mỗi lượt đi được hoàn 5% giá vé quy đổi thành điểm thưởng dùng thanh toán vé.'
          }
        ],
        vouchers: [
          {
            code: 'BACHKIM15',
            tabBg: '#1d4ed8',
            topText: 'GIẢM',
            valText: '15%',
            subTab: 'VIP',
            expiry: 'HSD: 31/12/2026',
            desc: 'Cho mọi hành trình liên tỉnh. Áp dụng trực tiếp tại bước thanh toán.',
            tagText: 'Hạng VIP',
            tagBg: '#ecfdf5',
            tagColor: '#059669',
            btnBg: '#1d4ed8'
          },
          {
            code: 'ANBINH50K',
            tabBg: '#b45309',
            topText: 'GIẢM',
            valText: '50K',
            subTab: 'KHỨ HỒI',
            expiry: 'HSD: 15/11/2026',
            desc: 'Áp dụng vé xe 2 chiều. Đơn từ 400.000đ trở lên.',
            tagText: 'Còn 12 ngày',
            tagBg: '#fef3c7',
            tagColor: '#d97706',
            btnBg: '#b45309'
          },
          {
            code: 'TRIANVIP',
            tabBg: '#4338ca',
            topText: 'GIẢM',
            valText: '100K',
            subTab: 'TRI ÂN',
            expiry: 'HSD: 30/11/2026',
            desc: 'Voucher tri ân khách hàng VIP. Đơn từ 200.000đ trở lên.',
            tagText: 'Bạch Kim',
            tagBg: '#eff6ff',
            tagColor: '#1d4ed8',
            btnBg: '#4338ca'
          }
        ]
      };
    } else if (t.includes('gold') || t.includes('vàng')) {
      return {
        key: 'gold',
        displayName: 'Hạng Vàng',
        shortBadge: 'Hạng Vàng',
        badgeBg: '#fef3c7',
        badgeColor: '#92400e',
        badgeBorder: '#fde68a',
        cardBg: 'linear-gradient(135deg, #78350f 0%, #b45309 50%, #92400e 100%)',
        starBg: 'rgba(245, 158, 11, 0.25)',
        starBorder: '#f59e0b',
        starColor: '#fbbf24',
        progressPercent: '75%',
        progressText: 'Tiến độ: 75% lên Bạch Kim',
        isMaxTier: false,
        benefitsTitle: 'Đặc Quyền Voucher Hạng Vàng',
        benefits: [
          {
            title: 'Voucher Giảm 10% Vé Xe (VANG10)',
            desc: 'Chiết khấu trực tiếp 10% (tối đa 60.000đ) áp dụng cho mọi chuyến xe.'
          },
          {
            title: 'Voucher Đặt Vé Khứ Hồi 50K (ANBINH50K)',
            desc: 'Giảm 50.000đ khi đặt vé khứ hồi cho đơn từ 400.000đ trở lên.'
          },
          {
            title: 'Voucher Sinh Nhật Thành Viên 50.000đ',
            desc: 'Tặng mã ưu đãi giảm giá 50.000đ vào tháng sinh nhật của khách hàng.'
          },
          {
            title: 'Tích Lũy 3% Điểm Thưởng Mỗi Chuyến Đi',
            desc: 'Mỗi chuyến đi được hoàn 3% giá trị vé vào ví điểm tích lũy thành viên.'
          }
        ],
        vouchers: [
          {
            code: 'VANG10',
            tabBg: '#b45309',
            topText: 'GIẢM',
            valText: '10%',
            subTab: 'VÀNG',
            expiry: 'HSD: 31/12/2026',
            desc: 'Chiết khấu 10% tối đa 60K mọi chuyến xe liên tỉnh.',
            tagText: 'Hạng Vàng',
            tagBg: '#fef3c7',
            tagColor: '#92400e',
            btnBg: '#b45309'
          },
          {
            code: 'ANBINH50K',
            tabBg: '#d97706',
            topText: 'GIẢM',
            valText: '50K',
            subTab: 'KHỨ HỒI',
            expiry: 'HSD: 15/11/2026',
            desc: 'Áp dụng vé xe 2 chiều. Đơn từ 400.000đ trở lên.',
            tagText: 'Còn 12 ngày',
            tagBg: '#fef3c7',
            tagColor: '#d97706',
            btnBg: '#d97706'
          },
          {
            code: 'ANBINH2026',
            tabBg: '#059669',
            topText: 'GIẢM',
            valText: '50K',
            subTab: 'CHÀO XUÂN',
            expiry: 'HSD: 31/12/2026',
            desc: 'Ưu đãi đầu năm giảm ngay 50.000đ cho đơn từ 200.000đ.',
            tagText: 'Phổ thông',
            tagBg: '#ecfdf5',
            tagColor: '#059669',
            btnBg: '#059669'
          }
        ]
      };
    } else if (t.includes('silv') || t.includes('bạc')) {
      return {
        key: 'silver',
        displayName: 'Hạng Bạc',
        shortBadge: 'Hạng Bạc',
        badgeBg: '#f1f5f9',
        badgeColor: '#334155',
        badgeBorder: '#cbd5e1',
        cardBg: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #1e293b 100%)',
        starBg: 'rgba(255, 255, 255, 0.15)',
        starBorder: '#cbd5e1',
        starColor: '#e2e8f0',
        progressPercent: '45%',
        progressText: 'Tiến độ: 45% lên Vàng',
        isMaxTier: false,
        benefitsTitle: 'Đặc Quyền Voucher Hạng Bạc',
        benefits: [
          {
            title: 'Voucher Giảm 5% Vé Tuyến Dài (BAC05)',
            desc: 'Chiết khấu trực tiếp 5% (tối đa 30.000đ) cho các hành trình liên tỉnh.'
          },
          {
            title: 'Voucher Thăng Hạng Bạc 30.000đ',
            desc: 'Tặng ngay mã ưu đãi 30.000đ chúc mừng thành viên đạt hạng Bạc.'
          },
          {
            title: 'Voucher Khuyến Mãi Mùa Lễ Tết 30.000đ',
            desc: 'Nhận sớm các mã giảm giá 30.000đ các dịp cao điểm du lịch.'
          },
          {
            title: 'Tích Lũy 2% Điểm Thưởng Mỗi Chuyến Đi',
            desc: 'Mỗi chuyến đi được hoàn 2% giá trị vé vào ví điểm tích lũy.'
          }
        ],
        vouchers: [
          {
            code: 'BAC05',
            tabBg: '#475569',
            topText: 'GIẢM',
            valText: '5%',
            subTab: 'BẠC',
            expiry: 'HSD: 31/12/2026',
            desc: 'Chiết khấu 5% cho các chuyến xe đường dài liên tỉnh.',
            tagText: 'Hạng Bạc',
            tagBg: '#f1f5f9',
            tagColor: '#334155',
            btnBg: '#475569'
          },
          {
            code: 'ANBINH2026',
            tabBg: '#059669',
            topText: 'GIẢM',
            valText: '50K',
            subTab: 'CHÀO XUÂN',
            expiry: 'HSD: 31/12/2026',
            desc: 'Ưu đãi đầu năm giảm ngay 50.000đ cho đơn từ 200.000đ.',
            tagText: 'Phổ thông',
            tagBg: '#ecfdf5',
            tagColor: '#059669',
            btnBg: '#059669'
          },
          {
            code: 'BANMOI20',
            tabBg: '#2563eb',
            topText: 'GIẢM',
            valText: '20%',
            subTab: 'BẠN MỚI',
            expiry: 'HSD: 31/12/2026',
            desc: 'Giảm 20% tối đa 70.000đ cho đơn đặt vé đầu tiên.',
            tagText: 'Thành viên',
            tagBg: '#eff6ff',
            tagColor: '#2563eb',
            btnBg: '#2563eb'
          }
        ]
      };
    } else {
      // Bronze / Đồng / Khách mới
      return {
        key: 'bronze',
        displayName: 'Hạng Đồng',
        shortBadge: 'Hạng Đồng',
        badgeBg: '#ffedd5',
        badgeColor: '#78350f',
        badgeBorder: '#fed7aa',
        cardBg: 'linear-gradient(135deg, #451a03 0%, #78350f 50%, #451a03 100%)',
        starBg: 'rgba(245, 158, 11, 0.2)',
        starBorder: '#f59e0b',
        starColor: '#fbbf24',
        progressPercent: '20%',
        progressText: 'Tiến độ: 20% lên Bạc',
        isMaxTier: false,
        benefitsTitle: 'Đặc Quyền Voucher Hạng Đồng',
        benefits: [
          {
            title: 'Voucher Chào Bạn Mới 20% (BANMOI20)',
            desc: 'Giảm 20% (tối đa 70.000đ) áp dụng cho đơn đặt vé đầu tiên.'
          },
          {
            title: 'Voucher Chào Xuân 50.000đ (ANBINH2026)',
            desc: 'Ưu đãi trực tiếp 50.000đ cho đơn đặt vé từ 200.000đ.'
          },
          {
            title: 'Voucher Đặt Vé Khứ Hồi 50K (ANBINH50K)',
            desc: 'Giảm ngay 50.000đ khi đặt vé khứ hồi cho đơn từ 400.000đ.'
          },
          {
            title: 'Tích Lũy 1% Điểm Thưởng Mỗi Chuyến Đi',
            desc: 'Tích lũy 1% giá trị mỗi vé hoàn tất vào ví điểm thành viên.'
          }
        ],
        vouchers: [
          {
            code: 'BANMOI20',
            tabBg: '#2563eb',
            topText: 'GIẢM',
            valText: '20%',
            subTab: 'BẠN MỚI',
            expiry: 'HSD: 31/12/2026',
            desc: 'Giảm 20% tối đa 70.000đ cho đơn đặt vé đầu tiên.',
            tagText: 'Thành viên',
            tagBg: '#eff6ff',
            tagColor: '#2563eb',
            btnBg: '#2563eb'
          },
          {
            code: 'ANBINH2026',
            tabBg: '#059669',
            topText: 'GIẢM',
            valText: '50K',
            subTab: 'CHÀO XUÂN',
            expiry: 'HSD: 31/12/2026',
            desc: 'Ưu đãi đầu năm giảm ngay 50.000đ cho đơn từ 200.000đ.',
            tagText: 'Phổ thông',
            tagBg: '#ecfdf5',
            tagColor: '#059669',
            btnBg: '#059669'
          },
          {
            code: 'ANBINH50K',
            tabBg: '#b45309',
            topText: 'GIẢM',
            valText: '50K',
            subTab: 'KHỨ HỒI',
            expiry: 'HSD: 15/11/2026',
            desc: 'Áp dụng vé xe 2 chiều. Đơn từ 400.000đ trở lên.',
            tagText: 'Còn 12 ngày',
            tagBg: '#fef3c7',
            tagColor: '#d97706',
            btnBg: '#b45309'
          }
        ]
      };
    }
  };

  const tierCfg = getTierConfig(user.membershipTier || 'Platinum');
  const pointsVal = (user.points !== undefined && user.points !== null) ? Number(user.points) : 55750;

  return (
    <div className="profile-page-wrapper">
      
      {/* ─── Embedded Responsive CSS ─── */}
      <style>{`
        .profile-page-wrapper {
          max-width: 1360px;
          margin: 0 auto;
          padding: 8px 16px 14px 16px;
          font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #1e293b;
          box-sizing: border-box;
          width: 100%;
          overflow-x: hidden;
        }

        .profile-top-header {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 10px 16px;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.03);
        }

        .profile-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          min-width: 250px;
        }

        .profile-header-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .profile-main-grid {
          display: grid;
          grid-template-columns: 310px 1.22fr 1.08fr;
          gap: 12px;
          align-items: stretch;
          width: 100%;
        }

        .profile-col {
          display: flex;
          flex-direction: column;
          gap: 10px;
          min-width: 0;
        }

        .profile-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 12px 14px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.03);
          box-sizing: border-box;
        }

        /* Tablet (769px - 1024px) */
        @media screen and (max-width: 1024px) {
          .profile-main-grid {
            grid-template-columns: 1fr 1fr;
          }
          .profile-col-vouchers {
            grid-column: 1 / -1;
          }
        }

        /* Mobile (< 768px, including iPhone 14 Pro Max 430px) */
        @media screen and (max-width: 768px) {
          .profile-page-wrapper {
            padding: 8px 10px 24px 10px;
          }
          .profile-top-header {
            flex-direction: column;
            align-items: flex-start;
            padding: 10px 12px;
            gap: 8px;
          }
          .profile-header-left {
            width: 100%;
          }
          .profile-header-right {
            width: 100%;
            justify-content: space-between;
          }
          .profile-main-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          .profile-col-vouchers {
            grid-column: auto;
          }
          .profile-card {
            padding: 12px;
          }
        }
      `}</style>

      {/* ─── Top Header Card ─── */}
      <div className="profile-top-header">
        {/* Left header info */}
        <div className="profile-header-left">
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '9px',
            background: '#eff6ff',
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #dbeafe',
            flexShrink: 0
          }}>
            <Sliders size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.12rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Quản Lý Tài Khoản Thành Viên
              </h2>
              <span style={{
                background: tierCfg.badgeBg,
                color: tierCfg.badgeColor,
                border: `1px solid ${tierCfg.badgeBorder}`,
                fontSize: '0.72rem',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '6px'
              }}>
                {tierCfg.shortBadge}
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0 0 0' }}>
              Chào mừng trở lại, <strong style={{ color: '#0f172a' }}>{user.name || 'Hồ Văn Lộc'}</strong>! Bạn đang tận hưởng dịch vụ ưu đãi độc quyền từ An Bình Lines.
            </p>
          </div>
        </div>
      </div>

      {/* ─── Main 3-Column Responsive Grid ─── */}
      <div className="profile-main-grid">

        {/* ══════════ COLUMN 1: VIP Card & Voucher Privileges (Left) ══════════ */}
        <div className="profile-col">
          
          {/* VIP Membership Card */}
          <div style={{
            background: tierCfg.cardBg,
            borderRadius: '12px',
            padding: '14px 16px',
            color: '#ffffff',
            border: '1px solid rgba(255,255,255,0.08)',
            position: 'relative',
            boxShadow: '0 4px 12px rgba(11,34,70,0.25)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '175px'
          }}>
            {/* Header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.66rem', letterSpacing: '0.8px', color: '#93c5fd', fontWeight: '700', textTransform: 'uppercase' }}>
                  THÀNH VIÊN AN BÌNH
                </div>
                <div style={{ fontSize: '1.22rem', fontWeight: '800', color: '#ffffff', marginTop: '1px' }}>
                  {tierCfg.displayName}
                </div>
              </div>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: tierCfg.starBg,
                border: `1.5px solid ${tierCfg.starBorder}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: tierCfg.starColor
              }}>
                <Star size={16} fill={tierCfg.starColor} />
              </div>
            </div>

            {/* Points info */}
            <div style={{ margin: '8px 0 6px 0' }}>
              <div style={{ fontSize: '0.66rem', color: '#93c5fd', letterSpacing: '0.6px', textTransform: 'uppercase', fontWeight: '600' }}>
                ĐIỂM TÍCH LŨY
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '1.75rem', fontWeight: '900', color: '#ffffff', letterSpacing: '-0.5px' }}>
                  {pointsVal.toLocaleString('vi-VN')}
                </span>
                <span style={{ fontSize: '0.82rem', color: '#93c5fd', fontWeight: '600' }}>điểm</span>
              </div>
            </div>

            {/* Progress & Badge */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#cbd5e1', marginBottom: '4px' }}>
                <span>Tiến trình thăng hạng</span>
                <span style={{ fontWeight: '700', color: '#ffffff' }}>{tierCfg.progressText}</span>
              </div>
              <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.2)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: tierCfg.progressPercent, height: '100%', background: 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '6px', fontSize: '0.69rem', color: '#6ee7b7' }}>
                <CheckCircle2 size={13} />
                <span>
                  {tierCfg.isMaxTier 
                    ? 'Bạn đã đạt hạng thành viên cao nhất của hãng!' 
                    : 'Tích cực đặt vé để tự động nâng hạng và mở khóa thêm voucher!'}
                </span>
              </div>
            </div>
          </div>

          {/* Đặc Quyền Voucher Hạng (CHỈ LÀ VOUCHER & ĐIỂM THƯỞNG) */}
          <div className="profile-card" style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '5px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Ticket size={13} />
              </div>
              <h3 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                {tierCfg.benefitsTitle}
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {tierCfg.benefits.map((benefit, idx) => (
                <div 
                  key={idx} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: '9px', 
                    paddingBottom: idx < tierCfg.benefits.length - 1 ? '6px' : '0', 
                    borderBottom: idx < tierCfg.benefits.length - 1 ? '1px dashed #f1f5f9' : 'none' 
                  }}
                >
                  <div style={{ 
                    width: '24px', 
                    height: '24px', 
                    borderRadius: '6px', 
                    background: '#eff6ff', 
                    color: '#2563eb', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    flexShrink: 0, 
                    marginTop: '2px' 
                  }}>
                    {idx === 3 ? <Coins size={13} /> : <Percent size={13} />}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#0f172a' }}>
                      {benefit.title}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', lineHeight: 1.25, marginTop: '1px' }}>
                      {benefit.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══════════ COLUMN 2: Account Info & Password (Center) ══════════ */}
        <div className="profile-col">
          
          {/* Card: Thông Tin Cá Nhân */}
          <div className="profile-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '5px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={13} />
                </div>
                <h3 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  Thông Tin Cá Nhân
                </h3>
              </div>
            </div>

            {infoMessage.text && (
              <div style={{
                padding: '6px 10px',
                borderRadius: '6px',
                marginBottom: '8px',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: infoMessage.type === 'success' ? '#ecfdf5' : '#fef2f2',
                color: infoMessage.type === 'success' ? '#059669' : '#dc2626',
                border: `1px solid ${infoMessage.type === 'success' ? '#a7f3d0' : '#fecaca'}`
              }}>
                {infoMessage.type === 'success' ? <CheckCircle2 size={13} /> : <ShieldCheck size={13} />}
                <span>{infoMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '600', color: '#475569', marginBottom: '3px' }}>
                  Họ và tên
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                    <User size={14} />
                  </span>
                  <input
                    type="text"
                    placeholder="Nhập họ và tên đầy đủ"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (profileErrors.name) setProfileErrors(prev => ({ ...prev, name: '' }));
                    }}
                    style={{
                      width: '100%',
                      padding: '7px 10px 7px 32px',
                      fontSize: '0.8rem',
                      border: profileErrors.name ? '1px solid #dc2626' : '1px solid #cbd5e1',
                      backgroundColor: profileErrors.name ? '#fff5f5' : '#ffffff',
                      borderRadius: '6px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      color: '#0f172a'
                    }}
                  />
                </div>
                {profileErrors.name && (
                  <div style={{ color: '#dc2626', fontSize: '0.72rem', marginTop: '3px', fontWeight: '500' }}>
                    {profileErrors.name}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '600', color: '#475569', marginBottom: '3px' }}>
                  Số điện thoại
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                    <Phone size={14} />
                  </span>
                  <input
                    type="text"
                    value={user.phone}
                    disabled
                    style={{
                      width: '100%',
                      padding: '7px 10px 7px 32px',
                      fontSize: '0.8rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      backgroundColor: '#f8fafc',
                      color: '#64748b',
                      cursor: 'not-allowed',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '600', color: '#475569', marginBottom: '3px' }}>
                  Địa chỉ Email
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                    <Mail size={14} />
                  </span>
                  <input
                    type="email"
                    placeholder="Nhập địa chỉ email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (profileErrors.email) setProfileErrors(prev => ({ ...prev, email: '' }));
                    }}
                    style={{
                      width: '100%',
                      padding: '7px 10px 7px 32px',
                      fontSize: '0.8rem',
                      border: profileErrors.email ? '1px solid #dc2626' : '1px solid #cbd5e1',
                      backgroundColor: profileErrors.email ? '#fff5f5' : '#ffffff',
                      borderRadius: '6px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      color: '#0f172a'
                    }}
                  />
                </div>
                {profileErrors.email && (
                  <div style={{ color: '#dc2626', fontSize: '0.72rem', marginTop: '3px', fontWeight: '500' }}>
                    {profileErrors.email}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  marginTop: '4px',
                  padding: '7px 0',
                  background: '#1d4ed8',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Save size={13} />
                Cập nhật thông tin
              </button>
            </form>
          </div>

          {/* Card: Đổi Mật Khẩu Bảo Mật */}
          <div className="profile-card" style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '5px', background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Key size={13} />
                </div>
                <h3 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  Đổi Mật Khẩu Bảo Mật
                </h3>
              </div>
            </div>

            {passMessage.text && (
              <div style={{
                padding: '6px 10px',
                borderRadius: '6px',
                marginBottom: '8px',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: passMessage.type === 'success' ? '#ecfdf5' : '#fef2f2',
                color: passMessage.type === 'success' ? '#059669' : '#dc2626',
                border: `1px solid ${passMessage.type === 'success' ? '#a7f3d0' : '#fecaca'}`
              }}>
                {passMessage.type === 'success' ? <CheckCircle2 size={13} /> : <ShieldCheck size={13} />}
                <span>{passMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '600', color: '#475569', marginBottom: '3px' }}>
                  Mật khẩu hiện tại
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                    <Key size={14} />
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
                      padding: '7px 32px 7px 32px',
                      fontSize: '0.8rem',
                      border: passErrors.currentPassword ? '1px solid #dc2626' : '1px solid #cbd5e1',
                      backgroundColor: passErrors.currentPassword ? '#fff5f5' : '#ffffff',
                      borderRadius: '6px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}
                  >
                    {showCurrentPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {passErrors.currentPassword && (
                  <div style={{ color: '#dc2626', fontSize: '0.72rem', marginTop: '3px', fontWeight: '500' }}>
                    {passErrors.currentPassword}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '600', color: '#475569', marginBottom: '3px' }}>
                  Mật khẩu mới
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                    <Lock size={14} />
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
                      padding: '7px 32px 7px 32px',
                      fontSize: '0.8rem',
                      border: passErrors.newPassword ? '1px solid #dc2626' : '1px solid #cbd5e1',
                      backgroundColor: passErrors.newPassword ? '#fff5f5' : '#ffffff',
                      borderRadius: '6px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}
                  >
                    {showNewPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {passErrors.newPassword && (
                  <div style={{ color: '#dc2626', fontSize: '0.72rem', marginTop: '3px', fontWeight: '500' }}>
                    {passErrors.newPassword}
                  </div>
                )}
              </div>

              {/* Bottom footer row */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '6px' }}>
                <button
                  type="submit"
                  disabled={isSendingOtp}
                  style={{
                    padding: '6px 14px',
                    background: '#f8fafc',
                    color: '#1e293b',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    cursor: isSendingOtp ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isSendingOtp ? 'Đang gửi mã...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ══════════ COLUMN 3: Voucher Wallet (Right) ══════════ */}
        <div className="profile-col profile-col-vouchers">
          <div className="profile-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '5px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Tag size={13} />
                  </div>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                    Kho Voucher Của Bạn
                  </h3>
                </div>
                <span style={{
                  background: '#eff6ff',
                  color: '#2563eb',
                  border: '1px solid #bfdbfe',
                  fontSize: '0.7rem',
                  fontWeight: '700',
                  padding: '1px 8px',
                  borderRadius: '5px'
                }}>
                  {tierCfg.vouchers.length} mã sẵn sàng
                </span>
              </div>

              {copiedCode && (
                <div style={{
                  padding: '4px 8px',
                  borderRadius: '5px',
                  marginBottom: '8px',
                  fontSize: '0.72rem',
                  background: '#ecfdf5',
                  color: '#059669',
                  border: '1px solid #a7f3d0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  <Check size={12} />
                  <span>Đã sao chép mã <strong>{copiedCode}</strong> vào bộ nhớ tạm!</span>
                </div>
              )}

              {/* List of 3 Tickets (Tất cả đều là Voucher Giảm Giá Thực Tế) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {tierCfg.vouchers.map((vc) => (
                  <div 
                    key={vc.code}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      display: 'flex',
                      overflow: 'hidden',
                      background: '#ffffff',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div style={{
                      background: vc.tabBg,
                      color: '#ffffff',
                      width: '72px',
                      minWidth: '72px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '6px 2px',
                      borderRight: '1px dashed rgba(255,255,255,0.4)',
                      textAlign: 'center'
                    }}>
                      <span style={{ fontSize: '0.62rem', fontWeight: '700', opacity: 0.9 }}>{vc.topText}</span>
                      <span style={{ fontSize: '1.05rem', fontWeight: '900', lineHeight: 1.1 }}>{vc.valText}</span>
                      <span style={{ fontSize: '0.58rem', fontWeight: '700', letterSpacing: '0.6px', marginTop: '1px' }}>{vc.subTab}</span>
                    </div>
                    <div style={{ padding: '6px 10px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ fontSize: '0.8rem', color: '#1e293b', letterSpacing: '0.3px' }}>{vc.code}</strong>
                          <span style={{ fontSize: '0.64rem', color: '#94a3b8' }}>{vc.expiry}</span>
                        </div>
                        <div style={{ fontSize: '0.67rem', color: '#475569', lineHeight: 1.25, marginTop: '2px' }}>
                          {vc.desc}
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                        <span style={{ 
                          background: vc.tagBg, 
                          color: vc.tagColor, 
                          fontSize: '0.64rem', 
                          fontWeight: '700', 
                          padding: '1px 6px', 
                          borderRadius: '4px' 
                        }}>
                          {vc.tagText}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(vc.code)}
                          style={{
                            padding: '2px 8px',
                            background: vc.btnBg,
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '0.68rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                        >
                          <Copy size={10} />
                          Sao chép
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom input: Thêm mã giảm giá mới */}
            <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                Thêm mã giảm giá mới
              </label>
              {promoAlert && (
                <div style={{ fontSize: '0.7rem', color: '#059669', marginBottom: '4px', fontWeight: '600' }}>
                  {promoAlert}
                </div>
              )}
              <form onSubmit={handleApplyNewPromo} style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="Nhập mã khuyến mãi..."
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '5px 8px',
                    fontSize: '0.75rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '5px',
                    outline: 'none',
                    textTransform: 'uppercase',
                    minWidth: 0
                  }}
                />
                <button
                  type="submit"
                  style={{
                    padding: '5px 12px',
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '5px',
                    fontSize: '0.74rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Áp dụng
                </button>
              </form>
            </div>

          </div>
        </div>

      </div>

      {/* ─── MODAL XÁC THỰC OTP ĐỔI MẬT KHẨU (2FA) ─── */}
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
            borderRadius: '12px',
            width: '100%',
            maxWidth: '420px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden',
            border: '1px solid #e2e8f0'
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '7px',
                  background: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: '800', color: '#0f172a' }}>
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
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleVerifyChangePassOtp} style={{ padding: '18px 20px' }}>
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <p style={{ fontSize: '0.82rem', color: '#475569', margin: '0 0 6px 0', lineHeight: '1.5' }}>
                  Mã xác thực 6 số đã được gửi đến email:
                </p>
                <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#1e293b' }}>
                  {user?.email}
                </div>
              </div>

              {/* Input OTP 6 số */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#334155', marginBottom: '6px', textAlign: 'center' }}>
                  Nhập mã OTP 6 chữ số
                </label>
                <div style={{ position: 'relative' }}>
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
                </div>
                {otpError && (
                  <div style={{ color: '#dc2626', fontSize: '0.74rem', marginTop: '6px', textAlign: 'center', fontWeight: '500' }}>
                    {otpError}
                  </div>
                )}
              </div>

              {/* Timer Countdown & Resend */}
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
                  <Clock size={13} />
                  <span>Hiệu lực: {formatTimer(otpTimer)}</span>
                </div>
                <button
                  type="button"
                  disabled={otpTimer > 0 || isSendingOtp}
                  onClick={handleResendChangePassOtp}
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

              {/* Modal Buttons */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowOtpModal(false)}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isVerifyingOtp || changePassOtp.length !== 6}
                  style={{
                    flex: 2,
                    padding: '8px 0',
                    background: changePassOtp.length === 6 && !isVerifyingOtp ? '#2563eb' : '#94a3b8',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    color: '#ffffff',
                    cursor: changePassOtp.length === 6 && !isVerifyingOtp ? 'pointer' : 'not-allowed'
                  }}
                >
                  {isVerifyingOtp ? 'Đang xác thực...' : 'Xác nhận đổi mật khẩu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
