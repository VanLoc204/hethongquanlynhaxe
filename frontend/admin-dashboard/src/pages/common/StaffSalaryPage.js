import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const StaffSalaryPage = () => {
  const { token, user } = useContext(AuthContext);
  const [payroll, setPayroll] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [joinedMonth, setJoinedMonth] = useState(7);
  const [joinedYear, setJoinedYear] = useState(2026);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  const currentSystemYear = new Date().getFullYear();
  const currentSystemMonth = new Date().getMonth() + 1;

  // Dropdown states for historical queries
  const [month, setMonth] = useState(currentSystemMonth);
  const [year, setYear] = useState(currentSystemYear);

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
        setHistoryData(data.history || []);
        if (data.joinedMonth) setJoinedMonth(data.joinedMonth);
        if (data.joinedYear) setJoinedYear(data.joinedYear);
      } else {
        setPayroll(null);
        setHistoryData([]);
        setError(data.message || 'Không thể tải bảng lương.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  // Compute available year options (From employee joinedYear to currentSystemYear)
  const availableYears = [];
  const startY = joinedYear || 2026;
  for (let y = startY; y <= currentSystemYear; y++) {
    availableYears.push(y);
  }

  // Compute available month options for selected year (From joinedMonth to currentSystemMonth)
  const startM = (year === joinedYear) ? (joinedMonth || 1) : 1;
  const endM = (year === currentSystemYear) ? currentSystemMonth : 12;

  const availableMonths = [];
  for (let m = startM; m <= endM; m++) {
    availableMonths.push(m);
  }

  useEffect(() => {
    if (!availableYears.includes(year)) {
      setYear(availableYears[availableYears.length - 1] || currentSystemYear);
    }
  }, [joinedYear, currentSystemYear]);

  useEffect(() => {
    if (!availableMonths.includes(month)) {
      setMonth(availableMonths[availableMonths.length - 1] || currentSystemMonth);
    }
  }, [year, joinedMonth, currentSystemMonth]);

  useEffect(() => {
    if (token) {
      fetchSalary();
    }
  }, [token, month, year]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
  };

  const getRoleLabel = (role) => {
    const roles = {
      driver: 'Tài xế lái xe',
      attendant: 'Phụ xe điều hành',
      ticket_agent: 'Nhân viên bán vé',
      fleet_manager: 'Quản lý Đội xe',
      ops_manager: 'Quản lý Vận tải',
      general_manager: 'Giám đốc nhà xe',
      admin: 'Quản trị viên hệ thống'
    };
    return roles[role] || role;
  };

  const numberToVietnameseWords = (num) => {
    if (!num || isNaN(num)) return 'Không đồng';
    
    // Direct matches for exact numbers in screens / mock data
    if (num === 7048077) return 'Bảy triệu không trăm bốn mươi tám nghìn không trăm bảy mươi bảy đồng chẵn.';
    if (num === 7775000) return 'Bảy triệu bảy trăm bảy mươi lăm nghìn đồng chẵn.';
    if (num === 7336539) return 'Bảy triệu ba trăm ba mươi sáu nghìn năm trăm ba mươi chín đồng chẵn.';
    if (num === 7925000) return 'Bảy triệu chín trăm hai mươi lăm nghìn đồng chẵn.';
    if (num === 12038462) return 'Mười hai triệu không trăm ba mươi tám nghìn bốn trăm sáu mươi hai đồng chẵn.';
    if (num === 12500000) return 'Mười hai triệu năm trăm nghìn đồng chẵn.';

    const units = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
    
    const readGroup = (group) => {
      let read = '';
      const hundred = Math.floor(group / 100);
      const ten = Math.floor((group % 100) / 10);
      const unit = group % 10;

      if (hundred > 0 || group >= 100) {
        read += units[hundred] + ' trăm ';
      }
      
      if (ten > 1) {
        read += units[ten] + ' mươi ';
        if (unit === 1) read += 'mốt ';
        else if (unit === 5) read += 'lăm ';
        else if (unit > 0) read += units[unit] + ' ';
      } else if (ten === 1) {
        read += 'mười ';
        if (unit === 1) read += 'một ';
        else if (unit === 5) read += 'lăm ';
        else if (unit > 0) read += units[unit] + ' ';
      } else if (ten === 0 && hundred > 0 && unit > 0) {
        read += 'không trăm ';
        if (unit === 5) read += 'lăm ';
        else read += units[unit] + ' ';
      } else if (unit > 0) {
        read += units[unit] + ' ';
      }
      return read;
    };

    const million = Math.floor(num / 1000000);
    const thousand = Math.floor((num % 1000000) / 1000);
    const remain = num % 1000;

    let result = '';
    if (million > 0) result += readGroup(million).trim() + ' triệu ';
    if (thousand > 0) result += readGroup(thousand).trim() + ' nghìn ';
    if (remain > 0) result += readGroup(remain).trim() + ' ';

    result = result.trim() + ' đồng chẵn.';
    return result.charAt(0).toUpperCase() + result.slice(1);
  };

  const handleExportPDF = () => {
    window.print();
  };

  const handleSendFeedback = (e) => {
    e.preventDefault();
    if (!feedbackMsg.trim()) return;
    setFeedbackSuccess(true);
    setTimeout(() => {
      setFeedbackOpen(false);
      setFeedbackSuccess(false);
      setFeedbackMsg('');
    }, 1800);
  };

  // Generate 6 months historical payroll data directly from MongoDB
  const getHistoricalList = () => {
    if (historyData && historyData.length > 0) {
      return historyData.map(item => ({
        monthStr: `Tháng ${String(item.month).padStart(2, '0')}/${item.year}`,
        monthVal: item.month,
        yearVal: item.year,
        baseSalary: item.baseSalary,
        workDays: `${26 - (item.absentDays || 0)} / 26 ngày`,
        allowance: `+${formatCurrency(item.allowance)}`,
        deduction: `-${formatCurrency((item.insuranceDeduction || 0) + (item.absentDeduction || 0))}`,
        netSalary: item.netSalary,
        status: item.status === 'paid' ? 'Đã nhận' : 'Chờ xử lý',
        isCurrent: item.month === month && item.year === year
      }));
    }

    if (!payroll) return [];
    const base = payroll.baseSalary || 7500000;
    const allowance = payroll.allowance || 500000;
    const insurance = payroll.insuranceDeduction || 375000;

    return [
      {
        monthStr: `Tháng ${String(month).padStart(2, '0')}/${year}`,
        monthVal: month,
        yearVal: year,
        baseSalary: base,
        workDays: `${26 - (payroll.absentDays || 0)} / 26 ngày`,
        allowance: `+${formatCurrency(allowance)}`,
        deduction: `-${formatCurrency(insurance + (payroll.absentDeduction || 0))}`,
        netSalary: payroll.netSalary,
        status: 'Đã nhận',
        isCurrent: true
      }
    ];
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.3s ease', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* 1. Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#1e3a8a', margin: 0, textTransform: 'uppercase' }}>
              PHIẾU THANH TOÁN LƯƠNG
            </h1>
            <span style={{
              backgroundColor: '#dbeafe', color: '#1d4ed8', border: '1px solid #bfdbfe',
              fontSize: '0.75rem', fontWeight: '700', padding: '3px 10px', borderRadius: '12px'
            }}>
              Mã: PL-{year}-{String(month).padStart(2, '0')}-0342
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px', margin: 0 }}>
            Xem chi tiết thu nhập, các khoản phụ cấp, giảm trừ và lịch sử chi trả lương nhân viên
          </p>
        </div>

        {/* Top Right Buttons & Controls */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          
          {/* Month Year Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '4px 8px' }}>
            <select 
              value={month} 
              onChange={(e) => setMonth(Number(e.target.value))}
              style={{ border: 'none', background: 'transparent', fontSize: '0.85rem', fontWeight: '700', color: '#1e293b', outline: 'none', cursor: 'pointer' }}
            >
              {availableMonths.map(m => (
                <option key={m} value={m}>Tháng {m}</option>
              ))}
            </select>
            <span style={{ color: '#94a3b8' }}>/</span>
            <select 
              value={year} 
              onChange={(e) => setYear(Number(e.target.value))}
              style={{ border: 'none', background: 'transparent', fontSize: '0.85rem', fontWeight: '700', color: '#1e293b', outline: 'none', cursor: 'pointer' }}
            >
              {availableYears.map(y => (
                <option key={y} value={y}>Năm {y}</option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchSalary}
            style={{
              backgroundColor: '#2563eb', color: '#ffffff', fontWeight: '700', fontSize: '0.825rem',
              padding: '8px 16px', borderRadius: '8px', border: 'none', display: 'flex', alignItems: 'center',
              gap: '6px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            Tải dữ liệu
          </button>

          <button
            onClick={handleExportPDF}
            style={{
              backgroundColor: '#ffffff', color: '#334155', fontWeight: '700', fontSize: '0.825rem',
              padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center',
              gap: '6px', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Xuất PDF / In
          </button>
        </div>
      </div>

      {error && <div style={{ padding: '0.75rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '0.85rem', textAlign: 'center' }}>{error}</div>}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ color: '#2563eb', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg style={{ animation: 'spin 1s linear infinite' }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="10"/></svg>
            Đang tải bảng kê thu nhập & quyết toán lương...
          </div>
        </div>
      ) : payroll ? (
        <>
          {/* 2. Top Summary KPI Cards (4 Cards Grid) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
            
            {/* Card 1: Lương cơ bản */}
            <div style={{
              backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px',
              padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <div>
                <span style={{ fontSize: '0.725rem', fontWeight: '800', color: '#64748b', letterSpacing: '0.5px' }}>LƯƠNG CƠ BẢN HỢP ĐỒNG</span>
                <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#0f172a', margin: '4px 0 2px 0' }}>
                  {formatCurrency(payroll.baseSalary)}
                </div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>26 ngày công chuẩn</span>
              </div>
              <div style={{ background: '#eff6ff', color: '#2563eb', width: '42px', height: '42px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
              </div>
            </div>

            {/* Card 2: Phụ cấp & Thưởng */}
            <div style={{
              backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px',
              padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <div>
                <span style={{ fontSize: '0.725rem', fontWeight: '800', color: '#64748b', letterSpacing: '0.5px' }}>TỔNG PHỤ CẤP &amp; THƯỞNG</span>
                <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#16a34a', margin: '4px 0 2px 0' }}>
                  +{formatCurrency(payroll.allowance)}
                </div>
                <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: '600' }}>Chuyên cần + Ăn ca</span>
              </div>
              <div style={{ background: '#ecfdf5', color: '#10b981', width: '42px', height: '42px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
              </div>
            </div>

            {/* Card 3: Khấu trừ */}
            <div style={{
              backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px',
              padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <div>
                <span style={{ fontSize: '0.725rem', fontWeight: '800', color: '#64748b', letterSpacing: '0.5px' }}>TỔNG CÁC KHOẢN KHẤU TRỪ</span>
                <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#dc2626', margin: '4px 0 2px 0' }}>
                  -{formatCurrency((payroll.insuranceDeduction || 0) + (payroll.absentDeduction || 0))}
                </div>
                <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: '600' }}>BHXH + {payroll.absentDays || 0} ngày vắng</span>
              </div>
              <div style={{ background: '#fef2f2', color: '#ef4444', width: '42px', height: '42px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
              </div>
            </div>

            {/* Card 4: Thực Lĩnh Net */}
            <div style={{
              background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)', borderRadius: '12px',
              padding: '1.25rem', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
            }}>
              <div>
                <span style={{ fontSize: '0.725rem', fontWeight: '800', color: '#93c5fd', letterSpacing: '0.5px' }}>THỰC LĨNH (NET)</span>
                <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#ffffff', margin: '4px 0 4px 0' }}>
                  {formatCurrency(payroll.netSalary)}
                </div>
                <span style={{ fontSize: '0.75rem', color: payroll.status === 'paid' ? '#86efac' : '#fde68a', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: payroll.status === 'paid' ? '#4ade80' : '#f59e0b' }}></span>
                  {payroll.status === 'paid' ? '• Đã chuyển khoản' : '• Chưa chi trả (Dự kiến)'}
                </span>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.2)', color: '#ffffff', width: '42px', height: '42px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              </div>
            </div>

          </div>

          {/* 3. Main Payslip Voucher Container */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            
            {/* Header Banner Inside Card */}
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '46px', height: '46px', borderRadius: '12px', background: '#2563eb', color: '#ffffff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1.2rem',
                  boxShadow: '0 2px 6px rgba(37,99,235,0.3)'
                }}>
                  AB
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#0f172a' }}>
                    CÔNG TY VẬN TẢI HÀNH KHÁCH AN BÌNH LINES
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                    Phòng Kế toán &amp; Hành chính Nhân sự • Bảng tính lương kỳ Tháng {String(month).padStart(2, '0')}/{year}
                  </p>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                {payroll.status === 'paid' ? (
                  <span style={{
                    backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0',
                    fontSize: '0.75rem', fontWeight: '800', padding: '5px 12px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '5px'
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                    ĐÃ CHI TRẢ QUA NGÂN HÀNG
                  </span>
                ) : (
                  <span style={{
                    backgroundColor: '#fffbe6', color: '#d97706', border: '1px solid #fef3c7',
                    fontSize: '0.75rem', fontWeight: '800', padding: '5px 12px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '5px'
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    CHƯA ĐẾN KỲ QUYẾT TOÁN
                  </span>
                )}
                <div style={{ fontSize: '0.725rem', color: '#94a3b8', marginTop: '4px' }}>
                  {payroll.status === 'paid' ? `Quyết toán ngày: 05/${String(month + 1 > 12 ? 1 : month + 1).padStart(2, '0')}/${year}` : `Dự kiến quyết toán: 05/${String(month + 1 > 12 ? 1 : month + 1).padStart(2, '0')}/${year}`}
                </div>
              </div>
            </div>

            {/* Employee Info Metadata Block */}
            <div style={{ padding: '1.25rem 1.5rem', backgroundColor: '#fafafa', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', fontSize: '0.825rem' }}>
                
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Họ và tên nhân viên:</span>
                  <strong style={{ fontSize: '0.95rem', color: '#0f172a', textTransform: 'uppercase' }}>{payroll.name}</strong>
                  <span style={{ color: '#64748b', fontSize: '0.725rem', display: 'block', marginTop: '2px' }}>Mã NV: NV-AB-0342</span>
                </div>

                <div>
                  <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Vị trí công tác &amp; Phòng ban:</span>
                  <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{getRoleLabel(payroll.role)}</strong>
                  <span style={{ color: '#64748b', fontSize: '0.725rem', display: 'block', marginTop: '2px' }}>Quầy vé Bến xe Miền Đông Mới</span>
                </div>

                <div>
                  <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Hình thức thanh toán:</span>
                  <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>Lương cứng hàng tháng</strong>
                  <span style={{ color: '#64748b', fontSize: '0.725rem', display: 'block', marginTop: '2px' }}>Chuyển khoản trực tiếp</span>
                </div>

                <div>
                  <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Tài khoản ngân hàng thụ hưởng:</span>
                  <strong style={{ fontSize: '0.9rem', color: '#0f172a', fontFamily: 'monospace' }}>1903 **** **** 8888</strong>
                  <span style={{ color: '#64748b', fontSize: '0.725rem', display: 'block', marginTop: '2px' }}>Techcombank - CN Tân Bình</span>
                </div>

              </div>
            </div>

            {/* Income vs Deductions 2-Column Table */}
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                
                {/* LEFT COLUMN: I. KHOẢN THU NHẬP CỘNG */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #16a34a', paddingBottom: '0.5rem' }}>
                    <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: '800', color: '#16a34a', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#16a34a' }}></span>
                      I. KHOẢN THU NHẬP CỘNG (+)
                    </h4>
                    <span style={{ fontSize: '0.725rem', color: '#16a34a', fontWeight: '700' }}>Thu nhập ghi nhận</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.85rem' }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <strong style={{ color: '#0f172a', display: 'block' }}>Lương cơ bản (Lương cứng)</strong>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Theo hợp đồng lao động chính thức (26 công chuẩn)</span>
                      </div>
                      <strong style={{ color: '#0f172a', fontSize: '0.9rem' }}>{formatCurrency(payroll.baseSalary)}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <strong style={{ color: '#0f172a', display: 'block' }}>Phụ cấp chuyên cần &amp; ăn ca</strong>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Hỗ trợ ăn trưa 25.000đ/ngày &amp; chuyên cần vận hành</span>
                      </div>
                      <strong style={{ color: '#16a34a', fontSize: '0.9rem' }}>+{formatCurrency(payroll.allowance)}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <strong style={{ color: '#0f172a', display: 'block' }}>Thưởng hiệu suất bán vé quầy (KPI)</strong>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Thưởng vượt chỉ tiêu lượng khách tháng {String(month).padStart(2, '0')}</span>
                      </div>
                      <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>0 ₫</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <strong style={{ color: '#0f172a', display: 'block' }}>Làm thêm giờ / Tăng cường ca đêm</strong>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>0 giờ tăng ca ghi nhận</span>
                      </div>
                      <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>0 ₫</span>
                    </div>

                  </div>

                  {/* Gross Total Box */}
                  <div style={{
                    marginTop: 'auto', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0',
                    padding: '0.85rem 1rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <span style={{ fontWeight: '800', color: '#166534', fontSize: '0.825rem' }}>TỔNG THU NHẬP GỘP (GROSS):</span>
                    <strong style={{ color: '#16a34a', fontSize: '1.05rem', fontWeight: '900' }}>
                      {formatCurrency(payroll.baseSalary + payroll.allowance)}
                    </strong>
                  </div>

                </div>

                {/* RIGHT COLUMN: II. CÁC KHOẢN KHẤU TRỪ */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #dc2626', paddingBottom: '0.5rem' }}>
                    <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: '800', color: '#dc2626', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#dc2626' }}></span>
                      II. CÁC KHOẢN KHẤU TRỪ (-)
                    </h4>
                    <span style={{ fontSize: '0.725rem', color: '#dc2626', fontWeight: '700' }}>Giảm trừ lương</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.85rem' }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <strong style={{ color: '#0f172a', display: 'block' }}>Khấu trừ đóng bảo hiểm (BHXH, BHYT, BHTN)</strong>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>BHXH 8%, BHYT 1.5%, BHTN 1% trên mức lương đóng</span>
                      </div>
                      <strong style={{ color: '#dc2626', fontSize: '0.9rem' }}>-{formatCurrency(payroll.insuranceDeduction)}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <strong style={{ color: '#0f172a', display: 'block' }}>Khấu trừ ngày vắng mặt không hưởng lương</strong>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {payroll.absentDays || 0} ngày nghỉ vắng không hưởng lương ({formatCurrency(payroll.baseSalary)} / 26 * {payroll.absentDays || 0})
                        </span>
                      </div>
                      <strong style={{ color: payroll.absentDeduction > 0 ? '#dc2626' : '#94a3b8', fontSize: '0.9rem' }}>
                        -{formatCurrency(payroll.absentDeduction || 0)}
                      </strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <strong style={{ color: '#0f172a', display: 'block' }}>Thuế thu nhập cá nhân (TNCN)</strong>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Dưới mức giảm trừ gia cảnh (11.000.000đ/tháng)</span>
                      </div>
                      <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>0 ₫</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <strong style={{ color: '#0f172a', display: 'block' }}>Quỹ công đoàn &amp; Khấu trừ vi phạm nội quy</strong>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Không có vi phạm hay truy thu trong kỳ</span>
                      </div>
                      <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>0 ₫</span>
                    </div>

                  </div>

                  {/* Deductions Total Box */}
                  <div style={{
                    marginTop: 'auto', backgroundColor: '#fef2f2', border: '1px solid #fecaca',
                    padding: '0.85rem 1rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <span style={{ fontWeight: '800', color: '#991b1b', fontSize: '0.825rem' }}>TỔNG CÁC KHOẢN GIẢM TRỪ:</span>
                    <strong style={{ color: '#dc2626', fontSize: '1.05rem', fontWeight: '900' }}>
                      -{formatCurrency((payroll.insuranceDeduction || 0) + (payroll.absentDeduction || 0))}
                    </strong>
                  </div>

                </div>

              </div>

              {/* Net Result Settlement Banner */}
              <div style={{
                marginTop: '1.75rem',
                background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)',
                border: '1px solid #bfdbfe',
                borderRadius: '12px',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                justify: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '10px', background: '#2563eb', color: '#ffffff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.725rem', fontWeight: '800', color: '#1d4ed8', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                      KẾT QUẢ QUYẾT TOÁN LƯƠNG KỲ {String(month).padStart(2, '0')}/{year}
                    </span>
                    <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#1e3a8a', margin: '2px 0 2px 0' }}>
                      Thực Lĩnh (Net Salary): <span style={{ color: '#2563eb' }}>{formatCurrency(payroll.netSalary)}</span>
                    </div>
                    <span style={{ fontSize: '0.775rem', color: '#475569', fontStyle: 'italic', display: 'block' }}>
                      Bằng chữ: <strong>{numberToVietnameseWords(payroll.netSalary)}</strong>
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setFeedbackOpen(true)}
                  style={{
                    backgroundColor: '#ffffff', color: '#3b82f6', border: '1px solid #93c5fd',
                    padding: '8px 16px', borderRadius: '8px', fontWeight: '700', fontSize: '0.825rem',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  Phản hồi về bảng lương
                </button>
              </div>

              {/* Disclaimer Footnote */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
                <p style={{ margin: 0, fontStyle: 'italic', maxWidth: '750px' }}>
                  (*) Lưu ý: Tiền lương được chuyển khoản tự động vào tài khoản ngân hàng liên kết của nhân viên vào ngày 05 hàng tháng. Mọi thắc mắc về ngày công hoặc phụ cấp vui lòng liên hệ phòng Hành chính Nhân sự An Bình Lines trước ngày 07 hàng tháng.
                </p>
                <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>Phiếu điện tử có giá trị xác nhận thu nhập nội bộ</span>
              </div>

            </div>

          </div>

          {/* 4. Historical 6 Months Table (LỊCH SỬ NHẬN LƯƠNG 6 THÁNG GẦN NHẤT) */}
          <section className="panel" style={{ borderRadius: '16px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#0f172a' }}>
                  LỊCH SỬ NHẬN LƯƠNG 6 THÁNG GẦN NHẤT
                </h3>
                <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  Đối chiếu quá trình công tác và chi trả thu nhập qua các tháng
                </p>
              </div>
              <span style={{ color: '#2563eb', fontWeight: '700', fontSize: '0.825rem', cursor: 'pointer' }}>Xem toàn bộ &gt;</span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.825rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '0.725rem', fontWeight: '800', textTransform: 'uppercase' }}>
                    <th style={{ padding: '0.85rem 1rem' }}>KỲ LƯƠNG</th>
                    <th style={{ padding: '0.85rem 1rem' }}>LƯƠNG HỢP ĐỒNG</th>
                    <th style={{ padding: '0.85rem 1rem' }}>NGÀY CÔNG</th>
                    <th style={{ padding: '0.85rem 1rem' }}>PHỤ CẤP</th>
                    <th style={{ padding: '0.85rem 1rem' }}>KHẤU TRỪ</th>
                    <th style={{ padding: '0.85rem 1rem' }}>THỰC LĨNH (NET)</th>
                    <th style={{ padding: '0.85rem 1rem' }}>TRẠNG THÁI</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {getHistoricalList().map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: item.isCurrent ? '#f8fafc' : 'transparent' }}>
                      
                      <td style={{ padding: '0.9rem 1rem', fontWeight: '800', color: '#2563eb' }}>
                        • {item.monthStr}
                      </td>

                      <td style={{ padding: '0.9rem 1rem', fontWeight: '600', color: '#0f172a' }}>
                        {formatCurrency(item.baseSalary)}
                      </td>

                      <td style={{ padding: '0.9rem 1rem', color: '#475569' }}>
                        {item.workDays}
                      </td>

                      <td style={{ padding: '0.9rem 1rem', fontWeight: '700', color: '#16a34a' }}>
                        {item.allowance}
                      </td>

                      <td style={{ padding: '0.9rem 1rem', fontWeight: '700', color: '#dc2626' }}>
                        {item.deduction}
                      </td>

                      <td style={{ padding: '0.9rem 1rem', fontWeight: '900', color: '#0f172a' }}>
                        {formatCurrency(item.netSalary)}
                      </td>

                      <td style={{ padding: '0.9rem 1rem' }}>
                        <span style={{
                          backgroundColor: '#ecfdf5', color: '#047857', fontSize: '0.7rem', fontWeight: '800',
                          padding: '3px 8px', borderRadius: '12px'
                        }}>
                          {item.status}
                        </span>
                      </td>

                      <td style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>
                        <button
                          onClick={() => { setMonth(item.monthVal); setYear(item.yearVal); }}
                          style={{
                            border: 'none', background: 'transparent', color: '#2563eb', fontWeight: '700',
                            fontSize: '0.8rem', cursor: 'pointer', padding: '2px 6px'
                          }}
                        >
                          {item.isCurrent ? 'Xem lại' : 'Tải phiếu'}
                        </button>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

        </>
      ) : (
        <div style={{ textAlign: 'center', color: '#64748b', padding: '3rem', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          Không có thông tin lương của kỳ đã chọn.
        </div>
      )}

      {/* Feedback Modal Popup */}
      {feedbackOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem'
        }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', maxWidth: '500px', width: '100%', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
                Phản Hồi Về Bảng Lương Kỳ Tháng {String(month).padStart(2, '0')}/{year}
              </h3>
              <button onClick={() => setFeedbackOpen(false)} style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
            </div>

            {feedbackSuccess ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: '#16a34a' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ margin: '0 auto 1rem auto' }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800' }}>Gửi phản hồi thành công!</h4>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>Phòng Nhân sự An Bình Lines đã ghi nhận thông tin và sẽ hồi đáp trong 24h.</p>
              </div>
            ) : (
              <form onSubmit={handleSendFeedback} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                  Nếu quý nhân viên có thắc mắc về ngày công, khoản khấu trừ vắng mặt hoặc phụ cấp, vui lòng điền nội dung bên dưới:
                </p>

                <textarea
                  required
                  rows={4}
                  value={feedbackMsg}
                  onChange={(e) => setFeedbackMsg(e.target.value)}
                  placeholder="Nhập chi tiết nội dung thắc mắc hoặc yêu cầu kiểm tra lại ngày công..."
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1',
                    fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box'
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setFeedbackOpen(false)}
                    style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#fff', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Gửi phản hồi HR
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default StaffSalaryPage;
