import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const StaffSalaryPage = () => {
  const { token } = useContext(AuthContext);
  const [payroll, setPayroll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSalary = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/v1/users/salary', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setPayroll(data.payroll);
        } else {
          setError(data.message || 'Không thể tải bảng lương.');
        }
      } catch (err) {
        setError('Lỗi kết nối máy chủ.');
      } finally {
        setLoading(false);
      }
    };

    fetchSalary();
  }, [token]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const getRoleLabel = (role) => {
    const roles = {
      driver: 'Tài xế lái xe',
      attendant: 'Phụ xe điều hành',
      ticket_agent: 'Nhân viên bán vé'
    };
    return roles[role] || role;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <div style={{ color: 'var(--primary)', fontWeight: '600' }}>Đang tải bảng kê lương...</div>
      </div>
    );
  }

  return (
    <section className="panel" style={{ maxWidth: '700px', margin: '0 auto', animation: 'fadeIn 0.4s ease' }}>
      <div style={{ textAlign: 'center', borderBottom: '2px dashed var(--card-border)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', color: 'var(--primary)', fontWeight: '800', textTransform: 'uppercase' }}>Phiếu Thanh Toán Lương Cố Định</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Tháng {payroll?.month} / Năm {payroll?.year}
        </p>
      </div>

      {error && <div className="error-message" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>{error}</div>}

      {payroll ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Vị trí công tác</span>
              <strong style={{ fontSize: '0.95rem' }}>{getRoleLabel(payroll.role)}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Hình thức thanh toán</span>
              <strong style={{ fontSize: '0.95rem' }}>Lương cứng hàng tháng</strong>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--card-border)' }}>
              <span>Lương cơ bản (Lương cứng):</span>
              <strong style={{ color: 'var(--text-main)' }}>{formatCurrency(payroll.baseSalary)}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--card-border)' }}>
              <span>Phụ cấp chuyên cần & ăn ca:</span>
              <strong style={{ color: 'var(--success)' }}>+{formatCurrency(payroll.allowance)}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--card-border)' }}>
              <span>Khấu trừ đóng bảo hiểm (BHXH, BHYT):</span>
              <strong style={{ color: '#ef4444' }}>-{formatCurrency(payroll.insuranceDeduction)}</strong>
            </div>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(63, 106, 216, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%)',
            padding: '1.25rem',
            borderRadius: '8px',
            border: '1px solid rgba(63, 106, 216, 0.1)',
            marginTop: '1.5rem'
          }}>
            <span style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '1.1rem' }}>Thực Lĩnh (Net Salary):</span>
            <strong style={{ color: 'var(--primary)', fontSize: '1.3rem', fontWeight: '800' }}>
              {formatCurrency(payroll.netSalary)}
            </strong>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem', fontStyle: 'italic' }}>
            (*) Lưu ý: Tiền lương được chuyển khoản tự động vào tài khoản ngân hàng liên kết của nhân viên vào ngày 05 hàng tháng. Mọi thắc mắc vui lòng liên hệ phòng hành chính nhân sự.
          </p>

        </div>
      ) : (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Không có thông tin lương tháng này.</div>
      )}
    </section>
  );
};

export default StaffSalaryPage;
