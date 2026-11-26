import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const API_BASE = 'http://localhost:8000/api';

const GmTargetsPage = () => {
  const { token } = useContext(AuthContext);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [branchFilter, setBranchFilter] = useState('all');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Target values stored in MongoDB
  const [revenueTarget, setRevenueTarget] = useState(250000000);
  const [occupancyTarget, setOccupancyTarget] = useState(25);
  const [counterTarget, setCounterTarget] = useState(175000000);
  const [onlineTarget, setOnlineTarget] = useState(75000000);
  const [targetSg, setTargetSg] = useState(125000000);
  const [targetDl, setTargetDl] = useState(75000000);
  const [targetCt, setTargetCt] = useState(50000000);
  const [notes, setNotes] = useState('');

  // Actual data calculated from system
  const [actualData, setActualData] = useState({
    actualRevenue: 0,
    actualCounterRevenue: 0,
    actualOnlineRevenue: 0,
    counterSharePercent: 0,
    onlineSharePercent: 0,
    actualOccupancy: 0,
    totalTrips: 0,
    totalSeatsBooked: 0,
    totalSeatsPossible: 0
  });

  // Progress metrics
  const [progressData, setProgressData] = useState({
    revenueProgress: 0,
    occupancyProgress: 0
  });

  // Detailed breakdowns
  const [branchBreakdown, setBranchBreakdown] = useState([]);
  const [staffPerformance, setStaffPerformance] = useState([]);

  const fetchTargets = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_BASE}/targets?month=${month}&year=${year}&branchId=${branchFilter}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (res.ok && data.success) {
        const t = data.target || {};
        setRevenueTarget(t.revenueTarget || 250000000);
        setOccupancyTarget(t.occupancyTarget || 25);
        setCounterTarget(t.counterTarget || 175000000);
        setOnlineTarget(t.onlineTarget || 75000000);

        if (Array.isArray(t.branchTargets)) {
          const sgObj = t.branchTargets.find(b => b.branchId === 'sg');
          const dlObj = t.branchTargets.find(b => b.branchId === 'dl');
          const ctObj = t.branchTargets.find(b => b.branchId === 'ct');
          if (sgObj) setTargetSg(sgObj.target);
          if (dlObj) setTargetDl(dlObj.target);
          if (ctObj) setTargetCt(ctObj.target);
        }

        setNotes(t.notes || `Chỉ tiêu vận hành tự động thiết lập cho Tháng ${String(month).padStart(2, '0')}/${year}`);
        setActualData(data.actual || {});
        setProgressData(data.progress || {});
        setBranchBreakdown(data.branchBreakdown || []);
        setStaffPerformance(data.staffPerformance || []);
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
  }, [token, month, year, branchFilter]);

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
          counterTarget: Number(counterTarget),
          onlineTarget: Number(onlineTarget),
          branchTargets: [
            { branchId: 'sg', target: Number(targetSg) },
            { branchId: 'dl', target: Number(targetDl) },
            { branchId: 'ct', target: Number(targetCt) }
          ],
          notes
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(data.message || 'Đã lưu chỉ tiêu doanh thu thành công!');
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

  const getBranchFilterLabel = () => {
    if (branchFilter === 'sg') return 'Chi nhánh TP. Hồ Chí Minh';
    if (branchFilter === 'dl') return 'Chi nhánh Đà Lạt';
    if (branchFilter === 'ct') return 'Chi nhánh Cần Thơ';
    return 'Tất cả các chi nhánh';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.3s ease' }}>
      
      {/* 1. Header Title & Filter Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
            Hoạch Định Doanh Thu Chi Nhánh
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px', margin: 0 }}>
            Thiết lập chỉ tiêu doanh số theo chi nhánh và theo dõi hiệu suất bán vé quầy vs online từ thực tế.
          </p>
        </div>

        {/* Filters Group: Branch, Month, Year */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          
          {/* Branch Filter Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>Chi nhánh:</span>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              style={{
                padding: '7px 12px', fontSize: '0.825rem', border: '1px solid #cbd5e1',
                borderRadius: '8px', background: '#ffffff', color: '#0f172a', fontWeight: '700', outline: 'none'
              }}
            >
              <option value="all">Toàn hệ thống (Tất cả chi nhánh)</option>
              <option value="sg">Chi nhánh TP. Hồ Chí Minh</option>
              <option value="dl">Chi nhánh Đà Lạt</option>
              <option value="ct">Chi nhánh Cần Thơ</option>
            </select>
          </div>

          {/* Month & Year Selectors */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>Kỳ:</span>
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
            disabled={loading}
            style={{
              backgroundColor: '#2563eb', color: '#ffffff', fontWeight: '700', fontSize: '0.825rem',
              padding: '8px 16px', borderRadius: '8px', border: 'none', display: 'flex', alignItems: 'center',
              gap: '6px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            {loading ? 'Đang tải...' : 'Tải lại'}
          </button>
        </div>
      </div>

      {/* Filter Scope Notice Banner */}
      <div style={{
        backgroundColor: '#f1f5f9', borderLeft: '4px solid #2563eb', padding: '0.65rem 1rem',
        borderRadius: '0 8px 8px 0', fontSize: '0.825rem', color: '#334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div>
          Đang xem dữ liệu: <strong style={{ color: '#0f172a' }}>{getBranchFilterLabel()}</strong> - Kỳ hoạt động: <strong style={{ color: '#0f172a' }}>Tháng {String(month).padStart(2, '0')}/{year}</strong>
        </div>
        <div style={{ fontSize: '0.775rem', color: '#64748b' }}>
          Tổng số chuyến khởi hành: <strong style={{ color: '#0f172a' }}>{actualData.totalTrips || 0} chuyến</strong>
        </div>
      </div>

      {error && <div style={{ padding: '0.75rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '0.85rem' }}>{error}</div>}
      {success && <div style={{ padding: '0.75rem', background: '#ecfdf5', color: '#047857', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600' }}>{success}</div>}

      {/* 2. 4 Top KPI Cards (Revenue, Occupancy, Counter Sales, Online Sales) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1.25rem' }}>
        
        {/* Card 1: Revenue Target */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', letterSpacing: '0.5px' }}>MỤC TIÊU DOANH THU</span>
            <span style={{
              backgroundColor: progressData.revenueProgress >= 80 ? '#ecfdf5' : progressData.revenueProgress >= 40 ? '#eff6ff' : '#fffbe6',
              color: progressData.revenueProgress >= 80 ? '#047857' : progressData.revenueProgress >= 40 ? '#2563eb' : '#d97706',
              fontSize: '0.75rem', fontWeight: '800', padding: '2px 10px', borderRadius: '12px'
            }}>
              {progressData.revenueProgress}%
            </span>
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#0f172a' }}>{formatVND(actualData.actualRevenue)}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
              Chỉ tiêu DB: {formatVND(branchFilter === 'all' ? revenueTarget : (branchBreakdown.find(b => b.branchId === branchFilter)?.target || revenueTarget))}
            </div>
          </div>
          <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{
              width: `${Math.min(progressData.revenueProgress, 100)}%`, height: '100%',
              backgroundColor: progressData.revenueProgress >= 80 ? '#10b981' : progressData.revenueProgress >= 40 ? '#2563eb' : '#f59e0b',
              transition: 'width 0.5s ease'
            }}></div>
          </div>
        </div>

        {/* Card 2: Occupancy Target */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', letterSpacing: '0.5px' }}>TỶ LỆ LẤP ĐẦY GHẾ</span>
            <span style={{
              backgroundColor: progressData.occupancyProgress >= 80 ? '#ecfdf5' : progressData.occupancyProgress >= 40 ? '#eff6ff' : '#fffbe6',
              color: progressData.occupancyProgress >= 80 ? '#047857' : progressData.occupancyProgress >= 40 ? '#2563eb' : '#d97706',
              fontSize: '0.75rem', fontWeight: '800', padding: '2px 10px', borderRadius: '12px'
            }}>
              {progressData.occupancyProgress}%
            </span>
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#2563eb' }}>{actualData.actualOccupancy}%</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
              Chỉ tiêu: {occupancyTarget}% ({actualData.totalSeatsBooked}/{actualData.totalSeatsPossible} chỗ)
            </div>
          </div>
          <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{
              width: `${Math.min(progressData.occupancyProgress, 100)}%`, height: '100%',
              backgroundColor: progressData.occupancyProgress >= 80 ? '#10b981' : progressData.occupancyProgress >= 40 ? '#2563eb' : '#f59e0b',
              transition: 'width 0.5s ease'
            }}></div>
          </div>
        </div>

        {/* Card 3: Counter Sales (Chi nhánh) */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', letterSpacing: '0.5px' }}>DOANH THU TẠI QUẦY (CHI NHÁNH)</span>
            <span style={{ backgroundColor: '#fff7ed', color: '#c2410c', fontSize: '0.75rem', fontWeight: '800', padding: '2px 10px', borderRadius: '12px' }}>
              Đóng góp {actualData.counterSharePercent}%
            </span>
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#c2410c' }}>{formatVND(actualData.actualCounterRevenue)}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
              Chỉ tiêu quầy vé: {formatVND(counterTarget)}
            </div>
          </div>
          <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(actualData.counterSharePercent, 100)}%`, height: '100%', backgroundColor: '#ea580c', transition: 'width 0.5s ease' }}></div>
          </div>
        </div>

        {/* Card 4: Online Sales (Trực tuyến) */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', letterSpacing: '0.5px' }}>DOANH THU TRỰC TUYẾN (ONLINE)</span>
            <span style={{ backgroundColor: '#faf5ff', color: '#7c3aed', fontSize: '0.75rem', fontWeight: '800', padding: '2px 10px', borderRadius: '12px' }}>
              Đóng góp {actualData.onlineSharePercent}%
            </span>
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#7c3aed' }}>{formatVND(actualData.actualOnlineRevenue)}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
              Chỉ tiêu online: {formatVND(onlineTarget)}
            </div>
          </div>
          <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(actualData.onlineSharePercent, 100)}%`, height: '100%', backgroundColor: '#9333ea', transition: 'width 0.5s ease' }}></div>
          </div>
        </div>

      </div>

      {/* 3. Branch Breakdown Table (Always visible or highlighting selected) */}
      <section className="panel" style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '4px', height: '18px', backgroundColor: '#2563eb', borderRadius: '2px', display: 'inline-block' }}></span>
            <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Bảng Phân Rã Doanh Thu &amp; Chỉ Tiêu Theo Chi Nhánh
            </h2>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>
            Dữ liệu tổng hợp từ 3 chi nhánh trọng điểm
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', fontSize: '0.725rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <th style={{ padding: '0.85rem 1rem' }}>CHI NHÁNH</th>
                <th style={{ padding: '0.85rem 1rem' }}>QUẢN LÝ PHÒNG VÉ</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>CHỈ TIÊU (DB)</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>DOANH THU THỰC TẾ</th>
                <th style={{ padding: '0.85rem 1rem' }}>CƠ CẤU (QUẦY / ONLINE)</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>LẤP ĐẦY GHẾ</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>TIẾN ĐỘ (%)</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>ĐÁNH GIÁ</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: '0.85rem' }}>
              {branchBreakdown.map((b) => {
                const isSelected = branchFilter === b.branchId;
                const rowBg = isSelected ? '#f0f9ff' : 'transparent';
                let ratingLabel = 'Cần đẩy mạnh';
                let ratingColor = '#d97706';
                let ratingBg = '#fffbe6';
                let ratingBorder = '#fef08a';

                if (b.revenueProgress >= 100) {
                  ratingLabel = 'Vượt chỉ tiêu';
                  ratingColor = '#047857';
                  ratingBg = '#ecfdf5';
                  ratingBorder = '#a7f3d0';
                } else if (b.revenueProgress >= 80) {
                  ratingLabel = 'Đạt chỉ tiêu tốt';
                  ratingColor = '#047857';
                  ratingBg = '#ecfdf5';
                  ratingBorder = '#a7f3d0';
                } else if (b.revenueProgress >= 40) {
                  ratingLabel = 'Tiến độ khả quan';
                  ratingColor = '#2563eb';
                  ratingBg = '#eff6ff';
                  ratingBorder = '#bfdbfe';
                }

                return (
                  <tr key={b.branchId} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: rowBg, cursor: 'pointer' }} onClick={() => setBranchFilter(b.branchId)}>
                    <td style={{ padding: '1rem', fontWeight: '700', color: '#0f172a' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: '4px', fontSize: '0.725rem', fontWeight: '800',
                          backgroundColor: b.branchId === 'sg' ? '#eff6ff' : (b.branchId === 'dl' ? '#f5f3ff' : '#ecfdf5'),
                          color: b.branchId === 'sg' ? '#1d4ed8' : (b.branchId === 'dl' ? '#6d28d9' : '#047857')
                        }}>
                          {b.branchId.toUpperCase()}
                        </span>
                        <span>{b.branchName}</span>
                      </div>
                      <div style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '2px' }}>
                        {b.totalTrips} chuyến khởi hành - {b.staffCount} nhân viên bán vé
                      </div>
                    </td>
                    <td style={{ padding: '1rem', color: '#334155' }}>
                      <div style={{ fontWeight: '700' }}>{b.managerName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{b.managerPhone}</div>
                    </td>
                    <td style={{ padding: '1rem', fontWeight: '600', color: '#64748b', textAlign: 'right' }}>
                      {formatVND(b.target)}
                    </td>
                    <td style={{ padding: '1rem', fontWeight: '800', color: '#0f172a', textAlign: 'right' }}>
                      {formatVND(b.actualRevenue)}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontSize: '0.75rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div>Quầy: <strong>{formatVND(b.counterRevenue)}</strong></div>
                        <div>Online: <strong>{formatVND(b.onlineRevenue)}</strong></div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <span style={{ fontWeight: '800', color: '#2563eb' }}>{b.occupancyRate}%</span>
                      <div style={{ fontSize: '0.725rem', color: '#64748b' }}>({b.totalSeatsBooked}/{b.totalSeatsPossible})</div>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.8rem' }}>{b.revenueProgress}%</span>
                        <div style={{ width: '50px', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(b.revenueProgress, 100)}%`, height: '100%', backgroundColor: b.revenueProgress >= 80 ? '#10b981' : (b.revenueProgress >= 40 ? '#2563eb' : '#f59e0b') }}></div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <span style={{
                        backgroundColor: ratingBg, color: ratingColor, border: `1px solid ${ratingBorder}`,
                        padding: '4px 10px', borderRadius: '16px', fontSize: '0.725rem', fontWeight: '700'
                      }}>
                        {ratingLabel}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. Staff Performance Table (Ticket Agents) */}
      <section className="panel" style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '4px', height: '18px', backgroundColor: '#059669', borderRadius: '2px', display: 'inline-block' }}></span>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Hiệu Suất Bán Vé Nhân Viên Quầy Vé (Chi Nhánh)
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '2px', margin: 0 }}>
                Theo dõi số vé bán, doanh thu tiền mặt, chuyển khoản và trạng thái ca trực của từng nhân viên.
              </p>
            </div>
          </div>

          <div style={{ fontSize: '0.775rem', color: '#64748b' }}>
            Đang hiển thị: <strong style={{ color: '#0f172a' }}>{staffPerformance.length} nhân viên bán vé</strong>
          </div>
        </div>

        {staffPerformance.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
            Không có nhân viên bán vé nào thuộc chi nhánh được chọn.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', fontSize: '0.725rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>NHÂN VIÊN BÁN VÉ</th>
                  <th style={{ padding: '0.85rem 1rem' }}>CHI NHÁNH / VĂN PHÒNG</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>SỐ VÉ ĐÃ BÁN</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>TIỀN MẶT</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>CHUYỂN KHOẢN</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>TỔNG DOANH THU</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>TRẠNG THÁI CA TRỰC</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '0.85rem' }}>
                {staffPerformance.map((staff, idx) => {
                  let shiftBadgeBg = '#f1f5f9';
                  let shiftBadgeColor = '#475569';
                  let shiftBadgeText = 'Chưa mở ca';

                  if (staff.shiftStatus === 'active') {
                    shiftBadgeBg = '#ecfdf5';
                    shiftBadgeColor = '#047857';
                    shiftBadgeText = 'Đang trong ca trực';
                  } else if (staff.shiftStatus === 'closed') {
                    shiftBadgeBg = '#f1f5f9';
                    shiftBadgeColor = '#334155';
                    shiftBadgeText = 'Đã giao ca xong';
                  }

                  return (
                    <tr key={staff.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '1rem', fontWeight: '700', color: '#0f172a' }}>
                        <div>{staff.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>
                          {staff.phone} - {staff.email || 'N/A'}
                        </div>
                      </td>
                      <td style={{ padding: '1rem', color: '#334155' }}>
                        <div style={{ fontWeight: '600', color: '#0f172a' }}>{staff.office}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{staff.branchName}</div>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '800', color: '#2563eb' }}>
                        {staff.ticketsSold} vé
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '600', color: '#059669' }}>
                        {formatVND(staff.cashRevenue)}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '600', color: '#2563eb' }}>
                        {formatVND(staff.cashlessRevenue)}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '900', color: '#0f172a' }}>
                        {formatVND(staff.totalRevenue)}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <span style={{
                          backgroundColor: shiftBadgeBg, color: shiftBadgeColor,
                          padding: '4px 10px', borderRadius: '16px', fontSize: '0.725rem', fontWeight: '700',
                          display: 'inline-flex', alignItems: 'center', gap: '4px'
                        }}>
                          {staff.shiftStatus === 'active' && (
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                          )}
                          {shiftBadgeText}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 5. Main Target Form Panel (MongoDB Configuration) */}
      <section className="panel" style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
        
        {/* Section Title Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Thiết Lập Chỉ Tiêu Vận Hành Tháng {String(month).padStart(2, '0')}/{year}
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '2px', margin: 0 }}>
              Thiết lập chỉ tiêu doanh số và phân bổ ngân sách kế hoạch cho các chi nhánh trong tháng.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveTarget} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Row 1: Tổng Doanh thu, Tỷ lệ lấp đầy, Chỉ tiêu quầy, Chỉ tiêu online */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1.25rem', alignItems: 'start' }}>
            
            {/* Input 1: Revenue Target */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontSize: '0.73rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                1. Chỉ tiêu tổng doanh thu tháng (VND) <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="number"
                  value={revenueTarget}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setRevenueTarget(val);
                    setCounterTarget(Math.round(val * 0.7));
                    setOnlineTarget(Math.round(val * 0.3));
                    setTargetSg(Math.round(val * 0.5));
                    setTargetDl(Math.round(val * 0.3));
                    setTargetCt(Math.round(val * 0.2));
                  }}
                  step="10000000"
                  style={{
                    width: '100%', padding: '9px 45px 9px 12px', fontSize: '0.85rem', border: '1px solid #cbd5e1',
                    borderRadius: '8px', outline: 'none', fontWeight: '700', color: '#0f172a', background: '#f8fafc'
                  }}
                  required
                />
                <span style={{ position: 'absolute', right: '12px', fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8' }}>VNĐ</span>
              </div>
              <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>
                Tổng doanh số toàn công ty
              </span>
            </div>

            {/* Input 2: Occupancy Target */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontSize: '0.73rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
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
              <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>
                Mục tiêu trung bình % ghế lấp đầy / chuyến
              </span>
            </div>

            {/* Input 3: Counter Target */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontSize: '0.73rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                3. Chỉ tiêu bán vé quầy (VND)
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="number"
                  value={counterTarget}
                  onChange={(e) => setCounterTarget(e.target.value)}
                  step="5000000"
                  style={{
                    width: '100%', padding: '9px 45px 9px 12px', fontSize: '0.85rem', border: '1px solid #cbd5e1',
                    borderRadius: '8px', outline: 'none', fontWeight: '700', color: '#0f172a', background: '#f8fafc'
                  }}
                />
                <span style={{ position: 'absolute', right: '12px', fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8' }}>VNĐ</span>
              </div>
              <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>
                Doanh thu quầy vé các chi nhánh
              </span>
            </div>

            {/* Input 4: Online Target */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontSize: '0.73rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                4. Chỉ tiêu bán vé online (VND)
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="number"
                  value={onlineTarget}
                  onChange={(e) => setOnlineTarget(e.target.value)}
                  step="5000000"
                  style={{
                    width: '100%', padding: '9px 45px 9px 12px', fontSize: '0.85rem', border: '1px solid #cbd5e1',
                    borderRadius: '8px', outline: 'none', fontWeight: '700', color: '#0f172a', background: '#f8fafc'
                  }}
                />
                <span style={{ position: 'absolute', right: '12px', fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8' }}>VNĐ</span>
              </div>
              <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>
                Doanh thu khách đặt trực tuyến
              </span>
            </div>

          </div>

          {/* Row 2: Phân bổ chỉ tiêu cho 3 Chi nhánh */}
          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.75rem' }}>
              Phân bổ chỉ tiêu doanh số theo từng chi nhánh:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Chi nhánh TP. Hồ Chí Minh (SG):
                </label>
                <input
                  type="number"
                  value={targetSg}
                  onChange={(e) => setTargetSg(e.target.value)}
                  step="5000000"
                  style={{ width: '100%', padding: '8px 12px', fontSize: '0.825rem', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#ffffff', fontWeight: '700' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Chi nhánh Đà Lạt (DL):
                </label>
                <input
                  type="number"
                  value={targetDl}
                  onChange={(e) => setTargetDl(e.target.value)}
                  step="5000000"
                  style={{ width: '100%', padding: '8px 12px', fontSize: '0.825rem', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#ffffff', fontWeight: '700' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Chi nhánh Cần Thơ (CT):
                </label>
                <input
                  type="number"
                  value={targetCt}
                  onChange={(e) => setTargetCt(e.target.value)}
                  step="5000000"
                  style={{ width: '100%', padding: '8px 12px', fontSize: '0.825rem', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#ffffff', fontWeight: '700' }}
                />
              </div>

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
              placeholder="VD: Tập trung tăng chuyến các tuyến du lịch, tối ưu tỷ lệ lấp đầy quầy vé BXMĐ..."
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
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </form>
      </section>

    </div>
  );
};

export default GmTargetsPage;
