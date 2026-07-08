import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { User, Mail, Phone, Lock, Award, Gift, CheckCircle2, ShieldAlert } from 'lucide-react';

const ProfilePage = () => {
  const { user, updateProfile, changePassword, loading } = useContext(AuthContext);

  // Profile fields state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  
  // Password change fields state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Status/alerts state
  const [infoMessage, setInfoMessage] = useState({ text: '', type: '' });
  const [passMessage, setPassMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  if (!user) {
    return (
      <div className="section-container" style={{ textAlign: 'center', padding: '5rem 0' }}>
        <h3>Vui lòng đăng nhập để xem thông tin tài khoản</h3>
      </div>
    );
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setInfoMessage({ text: '', type: '' });

    if (!name) {
      setInfoMessage({ text: 'Họ tên không được bỏ trống.', type: 'error' });
      return;
    }

    const res = await updateProfile(name, email);
    if (res.success) {
      setInfoMessage({ text: 'Cập nhật thông tin cá nhân thành công.', type: 'success' });
    } else {
      setInfoMessage({ text: res.message || 'Cập nhật thất bại.', type: 'error' });
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassMessage({ text: '', type: '' });

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPassMessage({ text: 'Vui lòng nhập đầy đủ các trường mật khẩu.', type: 'error' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassMessage({ text: 'Xác nhận mật khẩu mới không khớp.', type: 'error' });
      return;
    }

    if (newPassword.length < 6) {
      setPassMessage({ text: 'Mật khẩu mới phải từ 6 ký tự trở lên.', type: 'error' });
      return;
    }

    const res = await changePassword(currentPassword, newPassword);
    if (res.success) {
      setPassMessage({ text: 'Đổi mật khẩu thành công.', type: 'success' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPassMessage({ text: res.message || 'Đổi mật khẩu thất bại.', type: 'error' });
    }
  };

  // Membership rules & stats calculation
  const getTierColor = (tier) => {
    switch (tier?.toLowerCase()) {
      case 'platinum': return 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)';
      case 'gold': return 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)';
      case 'silver': return 'linear-gradient(135deg, #bdc3c7 0%, #2c3e50 100%)';
      default: return 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)'; // Bronze
    }
  };

  const getTierBadge = (tier) => {
    switch (tier?.toLowerCase()) {
      case 'platinum': return { text: 'Bạch Kim', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' };
      case 'gold': return { text: 'Vàng', color: '#eab308', bg: 'rgba(234,179,8,0.1)' };
      case 'silver': return { text: 'Bạc', color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' };
      default: return { text: 'Đồng', color: '#b45309', bg: 'rgba(180,83,9,0.1)' };
    }
  };

  const getTierBenefits = (tier) => {
    switch (tier?.toLowerCase()) {
      case 'platinum': return [
        'Giảm giá 15% tất cả các vé xe đặt trên hệ thống',
        'Ưu tiên chọn ghế VIP và lên xe trước',
        'Được đón trả khách tận nơi miễn phí (trong bán kính 10km)',
        'Hoàn hủy vé miễn phí trước giờ chạy 12 tiếng'
      ];
      case 'gold': return [
        'Giảm giá 10% tất cả các vé xe',
        'Phòng chờ VIP tại các bến xe chính',
        'Miễn phí 1 kiện hành lý ký gửi lên tới 35kg',
        'Hoàn hủy vé miễn phí trước giờ chạy 18 tiếng'
      ];
      case 'silver': return [
        'Giảm giá 5% tất cả các vé xe',
        'Tích lũy 2% giá trị vé dưới dạng điểm thưởng',
        'Miễn phí 1 kiện hành lý ký gửi lên tới 25kg'
      ];
      default: return [ // Bronze
        'Tích lũy điểm thưởng 1% giá trị vé đặt online',
        'Quà tặng sinh nhật thành viên trị giá 50.000đ',
        'Miễn phí nước uống và khăn lạnh trên xe'
      ];
    }
  };

  const activeBenefits = getTierBenefits(user.membershipTier);
  const badgeInfo = getTierBadge(user.membershipTier);

  return (
    <div className="section-container animate-fade-in" style={{ maxWidth: '1000px', paddingBottom: '5rem' }}>
      
      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '2.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <User size={32} style={{ color: 'var(--primary)' }} />
          Quản Lý Tài Khoản Thành Viên
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          Xem hạng thành viên, ưu đãi, thay đổi thông tin cá nhân và quản lý mật khẩu của bạn.
        </p>
      </div>

      <div className="profile-layout">
        
        {/* Left Side: Update info & Change password forms */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Form 1: Account Information */}
          <div className="glass-card" style={{ padding: '2rem' }}>
            <h3 style={{ fontWeight: '800', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={20} style={{ color: 'var(--primary)' }} />
              Thông tin cá nhân
            </h3>

            {infoMessage.text && (
              <div className="glass-card" style={{
                padding: '10px 15px',
                marginBottom: '1.5rem',
                borderColor: infoMessage.type === 'success' ? '#10b981' : '#ef4444',
                backgroundColor: infoMessage.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                color: infoMessage.type === 'success' ? '#10b981' : '#ef4444',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.85rem'
              }}>
                {infoMessage.type === 'success' ? <CheckCircle2 size={16} /> : <ShieldAlert size={16} />}
                <span>{infoMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile}>
              <div className="grid-2-col" style={{ marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Họ và tên</label>
                  <input
                    type="text"
                    className="form-control"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Số điện thoại</label>
                  <input
                    type="text"
                    className="form-control"
                    value={user.phone}
                    disabled
                    style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Địa chỉ Email</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '10px 24px' }}>
                Cập nhật thông tin
              </button>
            </form>
          </div>

          {/* Form 2: Change Password */}
          <div className="glass-card" style={{ padding: '2rem' }}>
            <h3 style={{ fontWeight: '800', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={20} style={{ color: 'var(--accent)' }} />
              Đổi mật khẩu bảo mật
            </h3>

            {passMessage.text && (
              <div className="glass-card" style={{
                padding: '10px 15px',
                marginBottom: '1.5rem',
                borderColor: passMessage.type === 'success' ? '#10b981' : '#ef4444',
                backgroundColor: passMessage.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                color: passMessage.type === 'success' ? '#10b981' : '#ef4444',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.85rem'
              }}>
                {passMessage.type === 'success' ? <CheckCircle2 size={16} /> : <ShieldAlert size={16} />}
                <span>{passMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Mật khẩu hiện tại</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Nhập mật khẩu đang dùng"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>

              <div className="grid-2-col" style={{ marginBottom: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label">Mật khẩu mới</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Mật khẩu từ 6 ký tự"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Xác nhận mật khẩu mới</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Nhập lại mật khẩu mới"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-secondary" disabled={loading} style={{ padding: '10px 24px' }}>
                Đổi mật khẩu
              </button>
            </form>
          </div>

        </div>

        {/* Right Side: Membership details card & Perks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Membership Tier Visual Card */}
          <div style={{
            background: getTierColor(user.membershipTier),
            borderRadius: '16px',
            padding: '2rem',
            color: '#ffffff',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Glossy Overlay design */}
            <div style={{
              position: 'absolute',
              right: '-50px',
              top: '-50px',
              width: '180px',
              height: '180px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.08)'
            }}></div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '0.8rem', opacity: '0.8', fontWeight: '600', letterSpacing: '0.5px' }}>THÀNH VIÊN Á ĐÔNG</span>
                <h3 style={{ fontSize: '1.75rem', fontWeight: '800', marginTop: '4px', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                  Hạng {badgeInfo.text}
                </h3>
              </div>
              <Award size={36} style={{ opacity: 0.9 }} />
            </div>

            <div style={{ marginTop: '3rem' }}>
              <span style={{ fontSize: '0.8rem', opacity: '0.8' }}>ĐIỂM TÍCH LŨY</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                <h2 style={{ fontSize: '2.5rem', fontWeight: '900', margin: '0' }}>{user.points || 150}</h2>
                <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>điểm</span>
              </div>
            </div>

            {/* Loyalty points to next tier progress */}
            <div style={{ marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', opacity: '0.9', marginBottom: '5px' }}>
                <span>Tiến trình thăng hạng</span>
                <span>{user.points || 150} / 500đ</span>
              </div>
              <div style={{ height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.25)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(((user.points || 150) / 500) * 100, 100)}%`, height: '100%', backgroundColor: '#ffffff' }}></div>
              </div>
              <p style={{ fontSize: '0.7rem', opacity: '0.85', marginTop: '6px', margin: '0' }}>
                Cần tích thêm {Math.max(500 - (user.points || 150), 0)} điểm để thăng lên hạng {user.membershipTier === 'Bronze' ? 'Bạc (Silver)' : 'Vàng (Gold)'}.
              </p>
            </div>
          </div>

          {/* Membership Benefits Perks list */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h4 style={{ fontWeight: '800', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              <Gift size={18} style={{ color: 'var(--accent)' }} />
              Quyền lợi hạng {badgeInfo.text}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activeBenefits.map((benefit, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: badgeInfo.color,
                    marginTop: '7px',
                    flexShrink: 0
                  }}></div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0', lineHeight: '1.4' }}>
                    {benefit}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default ProfilePage;
