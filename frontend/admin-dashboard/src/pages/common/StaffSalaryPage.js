import React, { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from '../../context/AuthContext';

const API_BASE = 'http://localhost:8000/api';

const numberToVietnameseWords = (num) => {
  if (!num || isNaN(num) || num <= 0) return 'Không đồng.';
  const units = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

  const readThreeDigits = (n, showZeroHundred = false) => {
    const hundred = Math.floor(n / 100);
    const ten = Math.floor((n % 100) / 10);
    const unit = n % 10;
    let text = '';

    if (hundred > 0) text += units[hundred] + ' trăm ';
    else if (showZeroHundred) text += 'không trăm ';

    if (ten > 1) {
      text += units[ten] + ' mươi ';
      if (unit === 1) text += 'mốt ';
      else if (unit === 5) text += 'lăm ';
      else if (unit > 0) text += units[unit] + ' ';
    } else if (ten === 1) {
      text += 'mười ';
      if (unit === 5) text += 'lăm ';
      else if (unit > 0) text += units[unit] + ' ';
    } else if (ten === 0 && (hundred > 0 || showZeroHundred) && unit > 0) {
      text += 'lẻ ' + (unit === 5 ? 'năm' : units[unit]) + ' ';
    } else if (unit > 0) {
      text += units[unit] + ' ';
    }
    return text.trim();
  };

  const billions = Math.floor(num / 1000000000);
  const millions = Math.floor((num % 1000000000) / 1000000);
  const thousands = Math.floor((num % 1000000) / 1000);
  const remain = Math.floor(num % 1000);

  const parts = [];
  if (billions > 0) parts.push(readThreeDigits(billions) + ' tỷ');
  if (millions > 0) parts.push(readThreeDigits(millions, parts.length > 0) + ' triệu');
  if (thousands > 0) parts.push(readThreeDigits(thousands, parts.length > 0) + ' nghìn');
  if (remain > 0) parts.push(readThreeDigits(remain, parts.length > 0));

  const res = parts.join(' ').trim() + ' đồng chẵn.';
  return res.charAt(0).toUpperCase() + res.slice(1);
};

const StaffSalaryPage = () => {
  const { token, user } = useContext(AuthContext);

  const currentSystemYear = new Date().getFullYear();
  const currentSystemMonth = new Date().getMonth() + 1;

  // Filter states
  const [month, setMonth] = useState(currentSystemMonth);
  const [year, setYear] = useState(currentSystemYear);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'paid', 'pending'
  const [activeView, setActiveView] = useState('payslip'); // 'payslip', 'incidents', 'history'

  // Data states
  const [payroll, setPayroll] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isDriver = user?.role === 'driver';

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  const getRoleLabel = (role) => {
    const roles = {
      driver: 'Tài xế lái xe',
      attendant: 'Phụ xe điều hành',
      ticket_agent: 'Nhân viên bán vé',
      ticket_manager: 'Quản lý phòng vé',
      fleet_manager: 'Quản lý Đội xe',
      ops_manager: 'Quản lý Vận tải',
      general_manager: 'Ban Giám đốc',
      admin: 'Quản trị viên'
    };
    return roles[role] || role;
  };

  const fetchSalary = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/users/salary?month=${month}&year=${year}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPayroll(data.payroll);
        setHistoryData(data.history || []);
      } else {
        setPayroll(null);
        setHistoryData([]);
        setError(data.message || 'Không thể tải bảng lương.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ khi tải bảng lương.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchSalary();
    }
  }, [token, month, year]);

  const incidentItems = useMemo(() => {
    return isDriver ? (payroll?.incidentItems || []) : [];
  }, [payroll, isDriver]);

  const incidentTotal = useMemo(() => {
    return isDriver ? (payroll?.incidentReimbursement || 0) : 0;
  }, [payroll, isDriver]);

  const grossSalary = useMemo(() => {
    if (!payroll) return 0;
    return (payroll.baseSalary || 0) + (payroll.allowance || 0) + incidentTotal;
  }, [payroll, incidentTotal]);

  const totalDeductions = useMemo(() => {
    if (!payroll) return 0;
    return (payroll.insuranceDeduction || 0) + (payroll.absentDeduction || 0);
  }, [payroll]);

  const totalNetPayout = useMemo(() => {
    if (!payroll) return 0;
    return (payroll.netSalary || 0) + incidentTotal;
  }, [payroll, incidentTotal]);

  // Available year and month options
  const years = [2024, 2025, 2026, 2027];
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '1200px', margin: '0 auto', paddingBottom: '2rem' }}>
      <style>{`
        .salary-box {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }
        .filter-btn {
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #475569;
          transition: all 0.15s ease;
        }
        .filter-btn.active {
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
        }
        .salary-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.78rem;
          text-align: left;
        }
        .salary-table th {
          background: #f8fafc;
          color: #475569;
          font-weight: 700;
          padding: 10px 12px;
          border-bottom: 2px solid #e2e8f0;
          white-space: nowrap;
        }
        .salary-table td {
          padding: 11px 12px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }
        .salary-table tr:hover td {
          background-color: #f8fafc;
        }
      `}</style>

      {/* 1. Header Card */}
      <div className="salary-box" style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#0f172a' }}>
              Bảng Kê Quyết Toán Lương &amp; Phụ Cấp Nhân Sự
            </h1>
            <span style={{
              background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe',
              padding: '2px 8px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: '700'
            }}>
              {getRoleLabel(user?.role)}
            </span>
          </div>
          <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
            {isDriver
              ? 'Tra cứu chi tiết thu nhập, tiền hoàn ứng sự cố dọc đường, các khoản khấu trừ và lịch sử quyết toán lương hàng tháng.'
              : 'Tra cứu chi tiết thu nhập, các khoản khấu trừ và lịch sử quyết toán lương hàng tháng.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={fetchSalary}
            style={{
              padding: '6px 14px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1',
              borderRadius: '6px', fontSize: '0.78rem', fontWeight: '700', color: '#334155', cursor: 'pointer'
            }}
          >
            Làm mới
          </button>
        </div>
      </div>

      {/* 2. Advanced Filter Suite */}
      <div className="salary-box" style={{ padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        {/* Left: View Mode Tabs */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveView('payslip')}
            className={`filter-btn ${activeView === 'payslip' ? 'active' : ''}`}
          >
            Phiếu lương chi tiết
          </button>
          {isDriver && (
            <button
              onClick={() => setActiveView('incidents')}
              className={`filter-btn ${activeView === 'incidents' ? 'active' : ''}`}
            >
              Khoản hoàn ứng sự cố ({incidentItems.length})
            </button>
          )}
          <button
            onClick={() => setActiveView('history')}
            className={`filter-btn ${activeView === 'history' ? 'active' : ''}`}
          >
            Lịch sử quyết toán 6 tháng
          </button>
        </div>

        {/* Right: Select Year, Month, Status */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b' }}>Tháng:</span>
            <select
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              style={{ padding: '5px 8px', fontSize: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: '700', color: '#0f172a' }}
            >
              {months.map(m => (
                <option key={m} value={m}>Tháng {m}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b' }}>Năm:</span>
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              style={{ padding: '5px 8px', fontSize: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: '700', color: '#0f172a' }}
            >
              {years.map(y => (
                <option key={y} value={y}>Năm {y}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b' }}>Trạng thái:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ padding: '5px 8px', fontSize: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
            >
              <option value="all">Tất cả kỳ lương</option>
              <option value="paid">Đã quyết toán</option>
              <option value="pending">Chờ quyết toán</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.7rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '0.78rem', fontWeight: '600' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="salary-box" style={{ padding: '3rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
          Đang tổng hợp dữ liệu bảng lương...
        </div>
      ) : payroll ? (
        <>
          {/* 3. KPI Cards Grid: 4 cột cho Tài xế, 3 cột cho các nhân sự khác */}
          <div style={{ display: 'grid', gridTemplateColumns: isDriver ? 'repeat(4, minmax(0, 1fr))' : 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
            {/* KPI 1 */}
            <div className="salary-box" style={{ padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
                Lương Cơ Bản Hợp Đồng
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0f172a' }}>
                {formatCurrency(payroll.baseSalary)}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                26 ngày công chuẩn
              </div>
            </div>

            {/* KPI 2 */}
            <div className="salary-box" style={{ padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '2px', borderLeft: '4px solid #16a34a' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: '700', color: '#16a34a', textTransform: 'uppercase' }}>
                Phụ Cấp &amp; Ăn Ca
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#16a34a' }}>
                +{formatCurrency(payroll.allowance)}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                Chuyên cần &amp; vận hành tuyến
              </div>
            </div>

            {/* KPI 3: Hoàn Ứng Sự Cố Dọc Đường (CHỈ HIỂN THỊ VỚI TÀI XẾ) */}
            {isDriver && (
              <div className="salary-box" style={{ padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '2px', borderLeft: '4px solid #059669' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: '700', color: '#059669', textTransform: 'uppercase' }}>
                  Hoàn Ứng Sự Cố Dọc Đường
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#047857' }}>
                  +{formatCurrency(incidentTotal)}
                </div>
                <div style={{ fontSize: '0.72rem', color: incidentItems.length > 0 ? '#047857' : '#64748b', fontWeight: incidentItems.length > 0 ? '700' : '500' }}>
                  {incidentItems.length > 0 ? `${incidentItems.length} sự cố được Quản lý duyệt` : 'Không phát sinh chi phí'}
                </div>
              </div>
            )}

            {/* KPI 4: Thực Lĩnh */}
            <div className="salary-box" style={{ padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '2px', borderLeft: '4px solid #2563eb' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: '700', color: '#2563eb', textTransform: 'uppercase' }}>
                Lương Thực Lĩnh
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#1d4ed8' }}>
                {formatCurrency(totalNetPayout)}
              </div>
              <div style={{ fontSize: '0.72rem', color: payroll.status === 'paid' ? '#15803d' : '#b45309', fontWeight: '700' }}>
                {payroll.status === 'paid' ? 'Đã chi trả qua ngân hàng' : 'Chờ kỳ quyết toán'}
              </div>
            </div>
          </div>

          {/* VIEW 1: PHIẾU LƯƠNG CHI TIẾT */}
          {activeView === 'payslip' && (
            <div className="salary-box" style={{ overflow: 'hidden' }}>
              {/* Payslip Header */}
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
                    CÔNG TY TNHH VẬN TẢI HÀNH KHÁCH AN BÌNH LINES
                  </div>
                  <h2 style={{ margin: '3px 0 0', fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>
                    Phiếu Quyết Toán Lương Kỳ Tháng {String(month).padStart(2, '0')}/{year}
                  </h2>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '800',
                    backgroundColor: payroll.status === 'paid' ? '#ecfdf5' : '#fef3c7',
                    color: payroll.status === 'paid' ? '#047857' : '#b45309',
                    border: `1px solid ${payroll.status === 'paid' ? '#a7f3d0' : '#fde68a'}`
                  }}>
                    {payroll.status === 'paid' ? 'ĐÃ QUYẾT TOÁN QUA NGÂN HÀNG' : 'CHƯA ĐẾN KỲ QUYẾT TOÁN'}
                  </span>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '3px' }}>
                    Mã phiếu: PL-{year}-{String(month).padStart(2, '0')}-{user?._id ? user._id.slice(-4).toUpperCase() : '001'}
                  </div>
                </div>
              </div>

              {/* Employee Meta Info */}
              <div style={{ padding: '1rem 1.5rem', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px', fontSize: '0.78rem' }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>Họ và tên nhân sự:</span>
                    <strong style={{ color: '#0f172a', fontSize: '0.85rem' }}>{payroll.name || user?.name}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>Số điện thoại liên hệ:</span>
                    <strong style={{ color: '#0f172a' }}>{payroll.phone || user?.phone}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>Vị trí &amp; Nghiệp vụ:</span>
                    <strong style={{ color: '#0f172a' }}>{getRoleLabel(payroll.role || user?.role)}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>Đơn vị / Chi nhánh:</span>
                    <strong style={{ color: '#0f172a' }}>{user?.branch?.branchName || 'Chi nhánh TP. Hồ Chí Minh'}</strong>
                  </div>
                </div>
              </div>

              {/* 2-Column Earnings & Deductions Breakdown */}
              <div style={{ padding: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                  {/* Left: Khoản Thu Nhập (+) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #16a34a', paddingBottom: '6px' }}>
                      <strong style={{ fontSize: '0.85rem', color: '#16a34a', textTransform: 'uppercase' }}>
                        I. CÁC KHOẢN THU NHẬP (+)
                      </strong>
                      <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: '700' }}>Thu nhập ghi nhận</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.78rem', marginTop: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <strong style={{ color: '#0f172a', display: 'block' }}>Lương cơ bản (Lương cứng)</strong>
                          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Theo hợp đồng lao động chính thức (26 ngày công)</span>
                        </div>
                        <strong style={{ color: '#0f172a' }}>{formatCurrency(payroll.baseSalary)}</strong>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <strong style={{ color: '#0f172a', display: 'block' }}>Phụ cấp chuyên cần &amp; ăn ca</strong>
                          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Hỗ trợ ăn ca và chuyên cần vận hành tuyến</span>
                        </div>
                        <strong style={{ color: '#16a34a' }}>+{formatCurrency(payroll.allowance)}</strong>
                      </div>

                      {/* HOÀN ỨNG SỰ CỐ DỌC ĐƯỜNG (CHỈ HIỂN THỊ VỚI TÀI XẾ) */}
                      {isDriver && (
                        <div style={{
                          padding: '8px 10px', background: incidentTotal > 0 ? '#f0fdf4' : '#fafafa',
                          border: `1px solid ${incidentTotal > 0 ? '#bbf7d0' : '#e2e8f0'}`, borderRadius: '8px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <strong style={{ color: incidentTotal > 0 ? '#166534' : '#0f172a', display: 'block' }}>
                                Hoàn ứng chi phí sự cố dọc đường
                              </strong>
                              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                {incidentItems.length > 0 ? `Quyết toán ${incidentItems.length} khoản tiền tài xế đã ứng tự sửa chữa` : 'Không phát sinh chi phí'}
                              </span>
                            </div>
                            <strong style={{ color: incidentTotal > 0 ? '#15803d' : '#94a3b8', fontSize: '0.85rem' }}>
                              +{formatCurrency(incidentTotal)}
                            </strong>
                          </div>

                          {incidentItems.length > 0 && (
                            <div style={{ marginTop: '6px', borderTop: '1px dashed #bbf7d0', paddingTop: '6px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              {incidentItems.map((inc, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#166534' }}>
                                  <span>• <strong>{inc.incidentCode}</strong>: {inc.title.slice(0, 32)}...</span>
                                  <span style={{ fontWeight: '700' }}>{formatCurrency(inc.amount)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <strong style={{ color: '#0f172a', display: 'block' }}>Thưởng doanh thu / Lễ Tết</strong>
                          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Thưởng định kỳ theo chính sách nhà xe</span>
                        </div>
                        <span style={{ color: '#94a3b8' }}>0 ₫</span>
                      </div>
                    </div>

                    <div style={{ marginTop: 'auto', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '8px 12px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#166534' }}>TỔNG THU NHẬP:</span>
                      <strong style={{ fontSize: '0.95rem', fontWeight: '900', color: '#15803d' }}>
                        {formatCurrency(grossSalary)}
                      </strong>
                    </div>
                  </div>

                  {/* Right: Các Khoản Khấu Trừ (-) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #dc2626', paddingBottom: '6px' }}>
                      <strong style={{ fontSize: '0.85rem', color: '#dc2626', textTransform: 'uppercase' }}>
                        II. CÁC KHOẢN KHẤU TRỪ (-)
                      </strong>
                      <span style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: '700' }}>Giảm trừ lương</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.78rem', marginTop: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <strong style={{ color: '#0f172a', display: 'block' }}>Đóng BHXH, BHYT, BHTN bắt buộc</strong>
                          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Tỷ lệ trích đóng 10.5% theo quy định pháp luật</span>
                        </div>
                        <strong style={{ color: '#dc2626' }}>-{formatCurrency(payroll.insuranceDeduction)}</strong>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <strong style={{ color: '#0f172a', display: 'block' }}>Khấu trừ ngày vắng mặt không lương</strong>
                          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                            {payroll.absentDays || 0} ngày vắng ({formatCurrency(payroll.baseSalary)} / 26 công * {payroll.absentDays || 0})
                          </span>
                        </div>
                        <strong style={{ color: payroll.absentDeduction > 0 ? '#dc2626' : '#94a3b8' }}>
                          -{formatCurrency(payroll.absentDeduction || 0)}
                        </strong>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <strong style={{ color: '#0f172a', display: 'block' }}>Thuế thu nhập cá nhân (TNCN)</strong>
                          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Sau giảm trừ gia cảnh người lao động</span>
                        </div>
                        <span style={{ color: '#94a3b8' }}>0 ₫</span>
                      </div>
                    </div>

                    <div style={{ marginTop: 'auto', background: '#fef2f2', border: '1px solid #fecaca', padding: '8px 12px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#991b1b' }}>TỔNG CÁC KHOẢN GIẢM TRỪ:</span>
                      <strong style={{ fontSize: '0.95rem', fontWeight: '900', color: '#dc2626' }}>
                        -{formatCurrency(totalDeductions)}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Final Net Pay Banner */}
                <div style={{
                  marginTop: '1.5rem', background: '#0f172a', color: '#ffffff', borderRadius: '8px',
                  padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'
                }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>
                      SỐ TIỀN THỰC LĨNH CHUYỂN KHOẢN:
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '3px' }}>
                      <strong>Bằng chữ:</strong> {numberToVietnameseWords(totalNetPayout)}
                    </div>
                  </div>

                  <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#38bdf8' }}>
                    {formatCurrency(totalNetPayout)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: KHOẢN HOÀN ỨNG SỰ CỐ DỌC ĐƯỜNG (CHỈ DÀNH CHO TÀI XẾ) */}
          {isDriver && activeView === 'incidents' && (
            <div className="salary-box" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>
                    Danh Sách Khoản Chi Sự Cố Dọc Đường Được Quyết Toán Vào Lương
                  </h3>
                  <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                    Các khoản tiền tài xế đã tự ứng (vá vỏ, thay bóng đèn, mua nhớt...) được Quản lý vận tải đối chiếu chứng từ và duyệt cộng trực tiếp vào phiếu lương kỳ này.
                  </p>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
                    Tổng hoàn ứng kỳ Tháng {String(month).padStart(2, '0')}/{year}:
                  </div>
                  <strong style={{ fontSize: '1.25rem', color: '#059669' }}>
                    +{formatCurrency(incidentTotal)}
                  </strong>
                </div>
              </div>

              {incidentItems.length === 0 ? (
                <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.8rem', background: '#f8fafc', borderRadius: '8px' }}>
                  Không phát sinh chi phí sự cố dọc đường nào được duyệt trong kỳ Tháng {month}/{year}.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="salary-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px', textAlign: 'center' }}>STT</th>
                        <th>Mã sự cố</th>
                        <th>Ngày ghi nhận</th>
                        <th>Nội dung sự cố / Hỏng hóc</th>
                        <th style={{ textAlign: 'right' }}>Số tiền đã ứng</th>
                        <th>Trạng thái quyết toán</th>
                        <th>Thời điểm duyệt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {incidentItems.map((inc, idx) => (
                        <tr key={idx}>
                          <td style={{ textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                          <td>
                            <span style={{ fontFamily: 'monospace', fontWeight: '700', color: '#1e293b', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                              {inc.incidentCode}
                            </span>
                          </td>
                          <td style={{ color: '#64748b', fontSize: '0.72rem' }}>
                            {formatDate(inc.approvedAt)}
                          </td>
                          <td style={{ fontWeight: '600', color: '#0f172a' }}>
                            {inc.title}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <strong style={{ color: '#059669', fontSize: '0.82rem' }}>
                              +{formatCurrency(inc.amount)}
                            </strong>
                          </td>
                          <td>
                            <span style={{
                              padding: '2px 8px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: '700',
                              backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0'
                            }}>
                              Đã cộng vào lương tháng {month}/{year}
                            </span>
                          </td>
                          <td style={{ color: '#64748b', fontSize: '0.72rem' }}>
                            {formatDate(inc.approvedAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* VIEW 3: LỊCH SỬ LƯƠNG 6 THÁNG */}
          {activeView === 'history' && (
            <div className="salary-box" style={{ padding: '1.25rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>
                  Lịch Sử Quyết Toán Lương Các Kỳ Gần Nhất
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                  Bảng đối soát thu nhập thực lĩnh, phụ cấp và các khoản khấu trừ của nhân sự qua các tháng.
                </p>
              </div>

              {historyData.length === 0 ? (
                <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.8rem', background: '#f8fafc', borderRadius: '8px' }}>
                  Chưa có dữ liệu lịch sử lương trước đó.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="salary-table">
                    <thead>
                      <tr>
                        <th>Kỳ lương</th>
                        <th>Lương hợp đồng</th>
                        <th>Công chuẩn</th>
                        <th>Phụ cấp ăn ca</th>
                        {isDriver && <th>Hoàn ứng sự cố</th>}
                        <th>Khấu trừ</th>
                        <th>Lương thực lĩnh</th>
                        <th>Trạng thái</th>
                        <th style={{ textAlign: 'center' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyData.map((item, idx) => {
                        const isSelected = item.month === month && item.year === year;
                        const itemNetPayout = isDriver ? ((item.netSalary || 0) + (item.incidentReimbursement || 0)) : (item.netSalary || 0);
                        return (
                          <tr key={idx} style={{ backgroundColor: isSelected ? '#f8fafc' : 'transparent' }}>
                            <td>
                              <strong style={{ color: isSelected ? '#2563eb' : '#0f172a' }}>
                                Tháng {String(item.month).padStart(2, '0')}/{item.year}
                              </strong>
                              {isSelected && (
                                <span style={{ marginLeft: '6px', fontSize: '0.65rem', background: '#eff6ff', color: '#2563eb', padding: '1px 5px', borderRadius: '3px', fontWeight: '700' }}>
                                  Đang xem
                                </span>
                              )}
                            </td>
                            <td>{formatCurrency(item.baseSalary)}</td>
                            <td>{26 - (item.absentDays || 0)} / 26 ngày</td>
                            <td style={{ color: '#16a34a' }}>+{formatCurrency(item.allowance)}</td>
                            {isDriver && (
                              <td style={{ color: (item.incidentReimbursement || 0) > 0 ? '#059669' : '#64748b', fontWeight: (item.incidentReimbursement || 0) > 0 ? '700' : 'normal' }}>
                                {(item.incidentReimbursement || 0) > 0 ? `+${formatCurrency(item.incidentReimbursement)}` : '0 ₫'}
                              </td>
                            )}
                            <td style={{ color: '#dc2626' }}>
                              -{formatCurrency((item.insuranceDeduction || 0) + (item.absentDeduction || 0))}
                            </td>
                            <td>
                              <strong style={{ color: '#1e40af', fontSize: '0.85rem' }}>
                                {formatCurrency(itemNetPayout)}
                              </strong>
                            </td>
                            <td>
                              <span style={{
                                padding: '2px 8px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: '700',
                                backgroundColor: item.status === 'paid' ? '#ecfdf5' : '#fef3c7',
                                color: item.status === 'paid' ? '#047857' : '#b45309'
                              }}>
                                {item.status === 'paid' ? 'Đã nhận tiền' : 'Chờ quyết toán'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                onClick={() => {
                                  setMonth(item.month);
                                  setYear(item.year);
                                  setActiveView('payslip');
                                }}
                                style={{
                                  padding: '3px 8px', backgroundColor: '#ffffff', color: '#2563eb',
                                  border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer'
                                }}
                              >
                                Xem phiếu
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="salary-box" style={{ padding: '3rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
          Không tìm thấy hồ sơ lương của kỳ đã chọn.
        </div>
      )}
    </div>
  );
};

export default StaffSalaryPage;
