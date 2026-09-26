import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const API_BASE = 'http://localhost:8000/api/v1';

const GmTargetsPage = () => {
  const { token } = useContext(AuthContext);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Target values stored in MongoDB
  const [revenueTarget, setRevenueTarget] = useState(1000000000);
  const [occupancyTarget, setOccupancyTarget] = useState(80);
  const [fuelBudget, setFuelBudget] = useState(150000000);
  const [maintenanceBudget, setMaintenanceBudget] = useState(50000000);
  const [notes, setNotes] = useState('');

  // Actual data calculated from system
  const [actualData, setActualData] = useState({
    actualRevenue: 0,
    actualOccupancy: 0,
    actualFuel: 0,
    actualMaintenance: 0,
    totalTrips: 0
  });

  // Progress metrics
  const [progressData, setProgressData] = useState({
    revenueProgress: 0,
    occupancyProgress: 0,
    fuelUsagePercent: 0,
    maintenanceUsagePercent: 0
  });

  const fetchTargets = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_BASE}/targets?month=${month}&year=${year}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (res.ok && data.success) {
        const t = data.target || {};
        setRevenueTarget(t.revenueTarget || 1000000000);
        setOccupancyTarget(t.occupancyTarget || 80);
        setFuelBudget(t.fuelBudget || 150000000);
        setMaintenanceBudget(t.maintenanceBudget || 50000000);
        setNotes(t.notes || `Chỉ tiêu vận hành tự động thiết lập cho Tháng ${String(month).padStart(2, '0')}/${year}`);

        setActualData(data.actual || {});
        setProgressData(data.progress || {});
      } else {
        setError(data.message || 'Không thể tải thông tin chỉ tiêu vận hành.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ khi lấy dữ liệu chỉ tiêu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchTargets();
    }
  }, [token, month, year]);

  const handleSaveTarget = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API_BASE}/targets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          month: Number(month),
          year: Number(year),
          revenueTarget: Number(revenueTarget),
          occupancyTarget: Number(occupancyTarget),
          fuelBudget: Number(fuelBudget),
          maintenanceBudget: Number(maintenanceBudget),
          notes
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(data.message || 'Đã lưu chỉ tiêu vận hành vào CSDL MongoDB!');
        fetchTargets();
      } else {
        setError(data.message || 'Không thể lưu chỉ tiêu vận hành.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ khi lưu chỉ tiêu.');
    } finally {
      setSaving(false);
    }
  };

  const formatVND = (amount) => {
    return (amount || 0).toLocaleString('vi-VN') + ' đ';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.3s ease' }}>
      
      {/* 1. Header Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
            Hoạch Định Chi Tiêu &amp; Chỉ Tiêu Vận Hành
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px', margin: 0 }}>
            Thiết lập chỉ tiêu kinh doanh vào CSDL MongoDB và theo dõi tiến độ hoàn thành tự động từ thực tế.
          </p>
        </div>

        {/* Month & Year Selectors */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>Kỳ vận hành:</span>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              style={{
                padding: '7px 12px', fontSize: '0.825rem', border: '1px solid #cbd5e1',
                borderRadius: '8px', background: '#ffffff', color: '#0f172a', fontWeight: '700', outline: 'none'
              }}
            >
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>Tháng {String(i + 1).padStart(2, '0')}</option>
              ))}
            </select>

            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              style={{
                padding: '7px 12px', fontSize: '0.825rem', border: '1px solid #cbd5e1',
                borderRadius: '8px', background: '#ffffff', color: '#0f172a', fontWeight: '700', outline: 'none'
              }}
            >
              <option value={2026}>Năm 2026</option>
              <option value={2027}>Năm 2027</option>
            </select>
          </div>

          <button
            onClick={fetchTargets}
            style={{
              backgroundColor: '#2563eb', color: '#ffffff', fontWeight: '700', fontSize: '0.825rem',
              padding: '8px 16px', borderRadius: '8px', border: 'none', display: 'flex', alignItems: 'center',
              gap: '6px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            Tải lại
          </button>
        </div>
      </div>

      {error && <div style={{ padding: '0.75rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '0.85rem' }}>{error}</div>}
      {success && <div style={{ padding: '0.75rem', background: '#ecfdf5', color: '#047857', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600' }}>{success}</div>}

      {/* 2. 4 Progress KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1.25rem' }}>
        
        {/* Card 1: Revenue Target */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', letterSpacing: '0.5px' }}>MỤC TIÊU DOANH THU</span>
            <span style={{ backgroundColor: '#fffbe6', color: '#d97706', fontSize: '0.75rem', fontWeight: '800', padding: '2px 10px', borderRadius: '12px' }}>
              {progressData.revenueProgress}%
            </span>
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#0f172a' }}>{formatVND(actualData.actualRevenue)}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>Chỉ tiêu DB: {formatVND(revenueTarget)}</div>
          </div>
          <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(progressData.revenueProgress, 100)}%`, height: '100%', backgroundColor: '#10b981', transition: 'width 0.5s ease' }}></div>
          </div>
        </div>

        {/* Card 2: Occupancy Target */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', letterSpacing: '0.5px' }}>TỶ LỆ LẤP ĐẦY GHẾ</span>
            <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', fontSize: '0.75rem', fontWeight: '800', padding: '2px 10px', borderRadius: '12px' }}>
              {progressData.occupancyProgress}%
            </span>
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#2563eb' }}>{actualData.actualOccupancy}%</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>Chỉ tiêu DB: {occupancyTarget}% / chuyến</div>
          </div>
          <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(progressData.occupancyProgress, 100)}%`, height: '100%', backgroundColor: '#2563eb', transition: 'width 0.5s ease' }}></div>
          </div>
        </div>

        {/* Card 3: Fuel Budget */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', letterSpacing: '0.5px' }}>HẠN MỨC TIỀN DẦU</span>
            <span style={{ backgroundColor: '#fff7ed', color: '#d97706', fontSize: '0.75rem', fontWeight: '800', padding: '2px 10px', borderRadius: '12px' }}>
              Đã chi {progressData.fuelUsagePercent}%
            </span>
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#0f172a' }}>{formatVND(actualData.actualFuel)}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>Hạn mức DB: {formatVND(fuelBudget)}</div>
          </div>
          <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(progressData.fuelUsagePercent, 100)}%`, height: '100%', backgroundColor: '#f59e0b', transition: 'width 0.5s ease' }}></div>
          </div>
        </div>

        {/* Card 4: Maintenance Budget */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', letterSpacing: '0.5px' }}>NGÂN SÁCH BẢO TRÌ XE</span>
            <span style={{ backgroundColor: '#faf5ff', color: '#7c3aed', fontSize: '0.75rem', fontWeight: '800', padding: '2px 10px', borderRadius: '12px' }}>
              Đã chi {progressData.maintenanceUsagePercent}%
            </span>
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#0f172a' }}>{formatVND(actualData.actualMaintenance)}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>Hạn mức DB: {formatVND(maintenanceBudget)}</div>
          </div>
          <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(progressData.maintenanceUsagePercent, 100)}%`, height: '100%', backgroundColor: '#7c3aed', transition: 'width 0.5s ease' }}></div>
          </div>
        </div>
      </div>

      {/* 3. Main Target Form Panel */}
      <section className="panel" style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
        
        {/* Section Title Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Thiết Lập Chỉ Tiêu Vận Hành Tháng {String(month).padStart(2, '0')}/{year} (Lưu MongoDB)
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '2px', margin: 0 }}>
              Các tham số này sẽ được ghi trực tiếp vào collection <code style={{ color: '#2563eb', backgroundColor: '#eff6ff', padding: '1px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>operation_targets</code>
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveTarget} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1.25rem', alignItems: 'start' }}>
            
            {/* Input 1: Revenue Target */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontSize: '0.73rem', fontWeight: '700', color: '#334155', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title="1. Chỉ tiêu tổng doanh thu tháng (VND) *">
                1. Chỉ tiêu tổng doanh thu tháng (VND) <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="number"
                  value={revenueTarget}
                  onChange={(e) => setRevenueTarget(e.target.value)}
                  step="10000000"
                  style={{
                    width: '100%', padding: '9px 45px 9px 12px', fontSize: '0.85rem', border: '1px solid #cbd5e1',
                    borderRadius: '8px', outline: 'none', fontWeight: '700', color: '#0f172a', background: '#f8fafc'
                  }}
                  required
                />
                <span style={{ position: 'absolute', right: '12px', fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8' }}>VNĐ</span>
              </div>
              <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                Ví dụ: 1.000.000.000 đ (1 Tỷ đồng)
              </span>
            </div>

            {/* Input 2: Occupancy Target */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontSize: '0.73rem', fontWeight: '700', color: '#334155', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title="2. Chỉ tiêu tỷ lệ lấp đầy ghế (%) *">
                2. Chỉ tiêu tỷ lệ lấp đầy ghế (%) <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="number"
                  value={occupancyTarget}
                  onChange={(e) => setOccupancyTarget(e.target.value)}
                  min="10"
                  max="100"
                  style={{
                    width: '100%', padding: '9px 35px 9px 12px', fontSize: '0.85rem', border: '1px solid #cbd5e1',
                    borderRadius: '8px', outline: 'none', fontWeight: '700', color: '#0f172a', background: '#f8fafc'
                  }}
                  required
                />
                <span style={{ position: 'absolute', right: '12px', fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8' }}>%</span>
              </div>
              <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                Mục tiêu trung bình % ghế lấp đầy / chuyến
              </span>
            </div>

            {/* Input 3: Fuel Budget */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontSize: '0.73rem', fontWeight: '700', color: '#334155', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title="3. Hạn mức ngân sách nhiên liệu / xăng dầu (VND) *">
                3. Hạn mức ngân sách nhiên liệu (VND) <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="number"
                  value={fuelBudget}
                  onChange={(e) => setFuelBudget(e.target.value)}
                  step="5000000"
                  style={{
                    width: '100%', padding: '9px 45px 9px 12px', fontSize: '0.85rem', border: '1px solid #cbd5e1',
                    borderRadius: '8px', outline: 'none', fontWeight: '700', color: '#0f172a', background: '#f8fafc'
                  }}
                  required
                />
                <span style={{ position: 'absolute', right: '12px', fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8' }}>VNĐ</span>
              </div>
              <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                Ngân sách tối đa chi cho nhiên liệu trong tháng
              </span>
            </div>

            {/* Input 4: Maintenance Budget */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontSize: '0.73rem', fontWeight: '700', color: '#334155', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title="4. Hạn mức ngân sách bảo trì & vật tư xe (VND) *">
                4. Hạn mức ngân sách bảo trì xe (VND) <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="number"
                  value={maintenanceBudget}
                  onChange={(e) => setMaintenanceBudget(e.target.value)}
                  step="5000000"
                  style={{
                    width: '100%', padding: '9px 45px 9px 12px', fontSize: '0.85rem', border: '1px solid #cbd5e1',
                    borderRadius: '8px', outline: 'none', fontWeight: '700', color: '#0f172a', background: '#f8fafc'
                  }}
                  required
                />
                <span style={{ position: 'absolute', right: '12px', fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8' }}>VNĐ</span>
              </div>
              <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                Dự phòng chi phí sửa chữa, bảo dưỡng xe
              </span>
            </div>

          </div>

          {/* Notes Input */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              Ghi chú định hướng vận hành:
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="VD: Tập trung tăng chuyến dịp cuối tuần, kiểm soát chặt tiền dầu..."
              style={{
                width: '100%', padding: '9px 12px', fontSize: '0.85rem', border: '1px solid #cbd5e1',
                borderRadius: '8px', outline: 'none', color: '#0f172a', background: '#ffffff'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                backgroundColor: '#2563eb', color: '#ffffff', fontSize: '0.875rem', fontWeight: '700',
                padding: '10px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px',
                boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.25)'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              {saving ? 'Đang lưu vào MongoDB...' : 'Lưu Chi Tiêu Tháng Vào MongoDB'}
            </button>
          </div>
        </form>
      </section>

      {/* 4. Comparison Board Table Panel */}
      <section className="panel" style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
        
        {/* Table Header Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '4px', height: '18px', backgroundColor: '#2563eb', borderRadius: '2px', display: 'inline-block' }}></span>
            <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Bảng Đối Chiếu Chỉ Tiêu MongoDB ↔ Thực Tế Hệ Thống
            </h2>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>
            Dữ liệu tổng hợp thời gian thực
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', fontSize: '0.725rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <th style={{ padding: '0.85rem 1rem' }}>HẠNG MỤC CHỈ TIÊU</th>
                <th style={{ padding: '0.85rem 1rem' }}>MỤC TIÊU (LƯU DB)</th>
                <th style={{ padding: '0.85rem 1rem' }}>DỮ LIỆU THỰC TẾ (SYSTEM)</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>TIẾN ĐỘ (%)</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>ĐÁNH GIÁ VẬN HÀNH</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: '0.85rem' }}>
              
              {/* Row 1: Doanh thu vé */}
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '1rem', fontWeight: '700', color: '#0f172a' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    </div>
                    <span>1. Tổng Doanh Thu Vé</span>
                  </div>
                </td>
                <td style={{ padding: '1rem', fontWeight: '600', color: '#64748b' }}>{formatVND(revenueTarget)}</td>
                <td style={{ padding: '1rem', fontWeight: '800', color: '#2563eb' }}>{formatVND(actualData.actualRevenue)}</td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.8rem' }}>{progressData.revenueProgress}%</span>
                    <div style={{ width: '60px', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(progressData.revenueProgress, 100)}%`, height: '100%', backgroundColor: '#f59e0b' }}></div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  <span style={{ backgroundColor: '#fffbe6', color: '#d97706', border: '1px solid #fef08a', padding: '4px 12px', borderRadius: '20px', fontSize: '0.725rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#d97706' }}></span>
                    Cần đẩy mạnh bán vé
                  </span>
                </td>
              </tr>

              {/* Row 2: Occupancy Rate */}
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '1rem', fontWeight: '700', color: '#0f172a' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    </div>
                    <span>2. Tỷ Lệ Lấp Đầy Ghế Trung Bình</span>
                  </div>
                </td>
                <td style={{ padding: '1rem', fontWeight: '600', color: '#64748b' }}>{occupancyTarget}% / chuyến</td>
                <td style={{ padding: '1rem', fontWeight: '800', color: '#2563eb' }}>{actualData.actualOccupancy}% / chuyến</td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.8rem' }}>{progressData.occupancyProgress}%</span>
                    <div style={{ width: '60px', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(progressData.occupancyProgress, 100)}%`, height: '100%', backgroundColor: '#2563eb' }}></div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  <span style={{ backgroundColor: '#fffbe6', color: '#d97706', border: '1px solid #fef08a', padding: '4px 12px', borderRadius: '20px', fontSize: '0.725rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#d97706' }}></span>
                    Cần tối ưu lịch chuyến
                  </span>
                </td>
              </tr>

              {/* Row 3: Fuel */}
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '1rem', fontWeight: '700', color: '#0f172a' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#fff7ed', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M3 22V4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v18"/><path d="M13 10h4a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V9l-3-3"/><path d="M3 22h10"/><line x1="7" y1="9" x2="9" y2="9"/></svg>
                    </div>
                    <span>3. Chi Phí Nhiên Liệu (Tiền Dầu)</span>
                  </div>
                </td>
                <td style={{ padding: '1rem', fontWeight: '600', color: '#64748b' }}>{formatVND(fuelBudget)}</td>
                <td style={{ padding: '1rem', fontWeight: '800', color: '#0f172a' }}>{formatVND(actualData.actualFuel)}</td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.8rem' }}>{progressData.fuelUsagePercent}%</span>
                    <div style={{ width: '60px', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(progressData.fuelUsagePercent, 100)}%`, height: '100%', backgroundColor: '#f59e0b' }}></div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  <span style={{ backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '4px 12px', borderRadius: '20px', fontSize: '0.725rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                    Trong ngân sách
                  </span>
                </td>
              </tr>

              {/* Row 4: Maintenance */}
              <tr>
                <td style={{ padding: '1rem', fontWeight: '700', color: '#0f172a' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#faf5ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                    </div>
                    <span>4. Chi Phí Bảo Trì &amp; Vật Tư Xe</span>
                  </div>
                </td>
                <td style={{ padding: '1rem', fontWeight: '600', color: '#64748b' }}>{formatVND(maintenanceBudget)}</td>
                <td style={{ padding: '1rem', fontWeight: '800', color: '#0f172a' }}>{formatVND(actualData.actualMaintenance)}</td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.8rem' }}>{progressData.maintenanceUsagePercent}%</span>
                    <div style={{ width: '60px', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(progressData.maintenanceUsagePercent, 100)}%`, height: '100%', backgroundColor: '#7c3aed' }}></div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  <span style={{ backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '4px 12px', borderRadius: '20px', fontSize: '0.725rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                    Kiểm soát an toàn
                  </span>
                </td>
              </tr>

            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
};

export default GmTargetsPage;
