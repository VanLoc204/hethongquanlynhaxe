import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const StaffSalaryPage = () => {
  const { token } = useContext(AuthContext);
  const [payroll, setPayroll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Dropdown states for historical queries
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const fetchSalary = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`http://localhost:8000/api/v1/users/salary?month=${month}&year=${year}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setPayroll(data.payroll);
        } else {
          setPayroll(null);
          setError(data.message || 'Không thể tải bảng lương.');
        }
      } catch (err) {
        setError('Lỗi kết nối máy chủ.');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchSalary();
    }
  }, [token, month, year]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const getRoleLabel = (role) => {
    const roles = {
      driver: 'Tài xế lái xe',
      attendant: 'Phụ xe điều hành',
      ticket_agent: 'Nhân viên bán vé',
      fleet_manager: 'Quản lý Đội xe',
      ops_manager: 'Quản lý Vận tải',
      general_manager: 'Giám đốc nhà xe'
    };
    return roles[role] || role;
  };

  return (
    <section className="panel" style={{ maxWidth: '700px', margin: '0 auto', animation: 'fadeIn 0.4s ease' }}>
      <div style={{ textAlign: 'center', borderBottom: '2px dashed var(--card-border)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', color: 'var(--primary)', fontWeight: '800', textTransform: 'uppercase' }}>Phiếu Thanh Toán Lương</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Xem lịch sử chi trả lương nhân viên
        </p>
      </div>

      {/* Date selector controls */}
      <div style={{ 
        display: 'flex', justifyContent: 'center', gap: '15px', alignItems: 'center',
        background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', 
        border: '1px solid var(--card-border)', marginBottom: '1.5rem'
      }}>
        <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)' }}>Chọn kỳ nhận lương:</label>
        
        <select 
          value={month} 
          onChange={(e) => setMonth(Number(e.target.value))}
          style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff' }}
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
            <option key={m} value={m}>Tháng {m}</option>
          ))}
        </select>

        <select 
          value={year} 
          onChange={(e) => setYear(Number(e.target.value))}
          style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff' }}
        >
          {[2025, 2026, 2027].map(y => (
            <option key={y} value={y}>Năm {y}</option>
          ))}
        </select>
      </div>

      {error && <div className="error-message" style={{ marginBottom: '1.5rem', textAlign: 'center', color: '#dc2626' }}>{error}</div>}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <div style={{ color: 'var(--primary)', fontWeight: '600' }}>Đang tải bảng kê lương...</div>
        </div>
      ) : payroll ? (
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
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>Không có thông tin lương của kỳ đã chọn.</div>
      )}
    </section>
  );
};

export default StaffSalaryPage;
