import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { Mail, Lock, ShieldAlert } from 'lucide-react';

const LoginPage = () => {
  const [loginKey, setLoginKey] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  // Forgot password state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotConfirmPass, setForgotConfirmPass] = useState('');
  const [modalError, setModalError] = useState('');

  const { login, forgotPassword, isAuthenticated, error, setError, loading } = useContext(AuthContext);
  const navigate = useNavigate();

  // Clear errors on load
  useEffect(() => {
    setError(null);
    setValidationError('');
  }, [setError]);

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    if (!loginKey || !password) {
      setValidationError('Vui lòng nhập đầy đủ thông tin đăng nhập.');
      return;
    }

    const res = await login(loginKey, password);
    if (res.success) {
      navigate('/');
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!forgotPhone || !forgotNewPass || !forgotConfirmPass) {
      setModalError('Vui lòng điền đầy đủ các thông tin yêu cầu.');
      return;
    }

    if (forgotNewPass !== forgotConfirmPass) {
      setModalError('Xác nhận mật khẩu mới không trùng khớp.');
      return;
    }

    if (forgotNewPass.length < 6) {
      setModalError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    const res = await forgotPassword(forgotPhone, forgotNewPass);
    if (res.success) {
      alert('Đặt lại mật khẩu thành công! Bây giờ bạn có thể đăng nhập bằng mật khẩu mới.');
      setShowForgotModal(false);
      setForgotPhone('');
      setForgotNewPass('');
      setForgotConfirmPass('');
    } else {
      setModalError(res.message || 'Có lỗi xảy ra, vui lòng thử lại.');
    }
  };

  return (
    <div className="placeholder-page animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '65vh' }}>
      <div className="glass-card" style={{ padding: '2.5rem', width: '100%', maxWidth: '420px' }}>
        <h2 style={{ marginBottom: '0.5rem', textAlign: 'center', fontWeight: '700', fontSize: '1.75rem' }}>Đăng Nhập</h2>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '2rem', fontSize: '0.9rem' }}>
          Đăng nhập để đặt vé xe và theo dõi hành trình
        </p>

        {(validationError || error) && (
          <div className="glass-card" style={{ 
            padding: '12px 16px', 
            marginBottom: '1.5rem', 
            borderColor: '#ef4444', 
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#f87171',
            fontSize: '0.9rem'
          }}>
            <ShieldAlert size={20} style={{ flexShrink: 0 }} />
            <span>{validationError || error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email hoặc Số điện thoại</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: '42px' }}
                placeholder="09xxx hoặc email@example.com"
                value={loginKey}
                onChange={(e) => setLoginKey(e.target.value)}
                disabled={loading}
              />
              <Mail size={18} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="form-label" style={{ margin: 0 }}>Mật khẩu</label>
              <button 
                type="button"
                onClick={() => {
                  setModalError('');
                  setShowForgotModal(true);
                }}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--primary)', 
                  cursor: 'pointer', 
                  fontSize: '0.85rem', 
                  fontWeight: '600',
                  padding: 0
                }}
              >
                Quên mật khẩu?
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                className="form-control"
                style={{ paddingLeft: '42px' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <Lock size={18} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }} disabled={loading}>
            {loading ? 'Đang xác thực...' : 'Đăng Nhập'}
          </button>
        </form>

        <p style={{ marginTop: '2rem', fontSize: '0.9rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Chưa có tài khoản?{' '}
          <Link to="/register" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '500' }}>
            Đăng ký thành viên
          </Link>
        </p>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div style={{
          position: 'fixed',
          left: '0',
          top: '0',
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: '9999'
        }}>
          <div className="glass-card animate-fade-in" style={{ padding: '2.5rem', maxWidth: '420px', width: '90%', backgroundColor: '#ffffff' }}>
            <h3 style={{ fontWeight: '800', textAlign: 'center', marginBottom: '0.5rem' }}>Đặt Lại Mật Khẩu</h3>
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Nhập Số điện thoại đăng ký và Mật khẩu mới để đặt lại mật khẩu của bạn.
            </p>

            {modalError && (
              <div className="glass-card" style={{
                padding: '8px 12px',
                marginBottom: '1rem',
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: '#f87171',
                fontSize: '0.8rem'
              }}>
                {modalError}
              </div>
            )}

            <form onSubmit={handleForgotSubmit}>
              <div className="form-group">
                <label className="form-label">Số điện thoại đăng ký</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Nhập SĐT tài khoản"
                  value={forgotPhone}
                  onChange={e => setForgotPhone(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mật khẩu mới</label>
                <input 
                  type="password" 
                  className="form-control" 
                  placeholder="Tối thiểu 6 ký tự"
                  value={forgotNewPass}
                  onChange={e => setForgotNewPass(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Xác nhận mật khẩu mới</label>
                <input 
                  type="password" 
                  className="form-control" 
                  placeholder="Nhập lại mật khẩu mới"
                  value={forgotConfirmPass}
                  onChange={e => setForgotConfirmPass(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>
                  Thiết lập mật khẩu mới
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ width: '100%', padding: '12px' }}
                  onClick={() => setShowForgotModal(false)}
                >
                  Hủy bỏ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
