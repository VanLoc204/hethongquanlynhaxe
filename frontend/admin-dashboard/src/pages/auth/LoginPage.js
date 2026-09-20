import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const LoginPage = () => {
  const { login, loading } = useContext(AuthContext);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!phone || !password) {
      setError('Vui lòng điền đầy đủ số điện thoại và mật khẩu.');
      return;
    }
    const result = await login(phone, password);
    if (!result.success) {
      setError(result.message);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <h2>Đăng Nhập Hệ Thống</h2>
          <p>Dành cho Quản lý & Nhân viên An Bình Lines</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Số điện thoại</label>
            <input
              type="text"
              className="form-control"
              placeholder="Nhập số điện thoại"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Mật khẩu</label>
            <input
              type="password"
              className="form-control"
              placeholder="Nhập mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="error-message" style={{ marginBottom: '1rem' }}>{error}</p>}

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Đang xác thực...' : 'Đăng Nhập'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: '1.8' }}>
          <strong>Tài khoản thử nghiệm</strong><br />
          Quản lý xe: <strong>0988888888</strong> / 123456<br />
          Admin: <strong>0955555666</strong> / 123456
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
