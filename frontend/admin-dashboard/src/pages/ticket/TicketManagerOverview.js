import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { getBranchById } from '../../constants/branches';

const API_BASE = 'http://localhost:8000/api';

const exportTicketManagerToExcel = (shifts = [], proposals = [], leaves = [], branchName = '') => {
  let csvContent = '\uFEFF'; // UTF-8 BOM for Microsoft Excel
  csvContent += `BÁO CÁO TỔNG QUAN PHÒNG VÉ & DOANH THU QUẦY - AN BÌNH LINES${branchName ? ` (${branchName})` : ''}\n`;
  csvContent += `Thời gian xuất báo cáo: ${new Date().toLocaleString('vi-VN')}\n\n`;

  csvContent += '1. DANH SÁCH CA TRỰC QUẦY VÉ GẦN ĐÂY\n';
  csvContent += 'STT,Quầy / Văn phòng,Nhân viên trực,Bắt đầu ca,Kết thúc ca,Tiền đầu ca (VNĐ),Thu tiền mặt (VNĐ),Thu QR/Online (VNĐ),Số vé bán,Trạng thái\n';

  shifts.forEach((shift, index) => {
    const counter = `"${(shift.userId?.assignedOffice || shift.officeName || 'Văn phòng bán vé').replace(/"/g, '""')}"`;
    const staff = `"${(shift.userId?.name || 'Nhân viên').replace(/"/g, '""')}"`;
    const start = shift.startTime ? `"${new Date(shift.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}"` : '"--"';
    const end = shift.endTime ? `"${new Date(shift.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}"` : '"Đang trực"';
    const initial = shift.initialCash || 0;
    const cash = shift.cashRevenue || 0;
    const cashless = shift.cashlessRevenue || 0;
    const tickets = shift.ticketsSold?.length || 0;
    const status = shift.status === 'active' ? 'Đang mở bán' : 'Đã kết ca';

    csvContent += `${index + 1},${counter},${staff},${start},${end},${initial},${cash},${cashless},${tickets},"${status}"\n`;
  });

  csvContent += '\n2. ĐỀ XUẤT ĐIỀU CHỈNH GIÁ VÉ GỬI BAN GIÁM ĐỐC\n';
  csvContent += 'STT,Tiêu đề đề xuất,Tuyến xe,Loại xe,Giá đề xuất (VNĐ),Thời gian áp dụng,Trạng thái duyệt\n';

  proposals.forEach((prop, index) => {
    const title = `"${(prop.title || '').replace(/"/g, '""')}"`;
    const route = `"${prop.routeId ? (prop.routeId.name || `${prop.routeId.startPoint} -> ${prop.routeId.endPoint}`) : 'N/A'}"`;
    const busType = `"${prop.busType || 'Tất cả'}"`;
    const price = prop.proposedPrice || 0;
    const fromStr = prop.effectiveFrom ? new Date(prop.effectiveFrom).toLocaleDateString('vi-VN') : '';
    const toStr = prop.effectiveTo ? new Date(prop.effectiveTo).toLocaleDateString('vi-VN') : '';
    const period = `"${fromStr} - ${toStr}"`;
    const status = prop.status === 'approved' ? 'Đã duyệt' : (prop.status === 'rejected' ? 'Bị từ chối' : 'Chờ duyệt');

    csvContent += `${index + 1},${title},${route},${busType},${price},${period},"${status}"\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Bao_Cao_Phong_Ve_AnBinhLines_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const TicketManagerOverview = ({ setActiveTab, onRefresh }) => {
  const { token, user } = useContext(AuthContext);

  const branchId = user?.branch?.branchId;
  const branchInfo = branchId ? getBranchById(branchId) : null;

  const [loading, setLoading] = useState(true);
  const [shifts, setShifts] = useState([]);
  const [ticketAgents, setTicketAgents] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [recentTrips, setRecentTrips] = useState([]);

  // Metrics
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [todayCash, setTodayCash] = useState(0);
  const [todayQr, setTodayQr] = useState(0);
  const [todayTicketsCount, setTodayTicketsCount] = useState(0);
  const [activeShiftsCount, setActiveShiftsCount] = useState(0);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Shift Sessions
      const shiftsRes = await fetch(`${API_BASE}/users/shift/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const shiftsData = await shiftsRes.json();
      const allShifts = shiftsData.success ? (shiftsData.history || []) : [];
      setShifts(allShifts);

      // Filter today's shifts
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const todayShifts = allShifts.filter(s => new Date(s.startTime) >= todayStart);

      let totalCash = 0;
      let totalQr = 0;
      let totalTickets = 0;
      let activeCount = 0;

      todayShifts.forEach(s => {
        totalCash += s.cashRevenue || 0;
        totalQr += s.cashlessRevenue || 0;
        totalTickets += s.ticketsSold?.length || 0;
        if (s.status === 'active') activeCount++;
      });

      setTodayCash(totalCash);
      setTodayQr(totalQr);
      setTodayRevenue(totalCash + totalQr);
      setTodayTicketsCount(totalTickets);
      setActiveShiftsCount(activeCount);

      // 2. Fetch Ticket Agents
      const staffRes = await fetch(`${API_BASE}/users/staff`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const staffData = await staffRes.json();
      if (staffData.success) {
        const agents = (staffData.staff || []).filter(s => s.role === 'ticket_agent');
        setTicketAgents(agents);
      }

      // 3. Fetch Leaves
      const leavesRes = await fetch(`${API_BASE}/users/admin/leaves`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const leavesData = await leavesRes.json();
      if (leavesData.success) {
        const pending = (leavesData.leaves || []).filter(l => l.status === 'pending');
        setPendingLeaves(pending);
      }

      // 4. Fetch Pricing Proposals
      const propRes = await fetch(`${API_BASE}/pricing/proposals`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const propData = await propRes.json();
      if (propData.success) {
        setProposals(propData.proposals || []);
      }

      // 5. Fetch Trips for selling performance
      const tripsRes = await fetch(`${API_BASE}/trips?limit=8`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const tripsData = await tripsRes.json();
      if (tripsData.success) {
        setRecentTrips(tripsData.trips || []);
      }

    } catch (err) {
      console.error('Lỗi tải dữ liệu dashboard phòng vé:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchDashboardData();
    }
  }, [token]);

  const pendingProposalsCount = proposals.filter(p => p.status === 'pending').length;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <div style={{ color: 'var(--primary)', fontWeight: '700' }}>Đang tải báo cáo tổng quan phòng vé...</div>
      </div>
    );
  }

  return (
    <>
      {/* Top Banner Card wrapping Header & 4 Stat Cards */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '1.25rem 1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        marginBottom: '0.85rem'
      }}>
        {/* Top Action Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>Dashboard Phòng Vé</h1>
              <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: '700' }}>
                Live Ticket Counter
              </span>
              {branchInfo && (
                <span style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: '700' }}>
                  {branchInfo.branchName || branchInfo.name}
                </span>
              )}
            </div>
            <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '2px', margin: 0 }}>
              Chào mừng trở lại, <strong style={{ color: '#2563eb' }}>{user?.name || 'Quản Lý Phòng Vé'}!</strong> Bảng điều khiển giám sát ca trực và doanh thu quầy vé {branchInfo ? (branchInfo.branchName || branchInfo.name) : 'An Bình Lines'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onRefresh || fetchDashboardData}
              className="btn"
              style={{
                backgroundColor: '#ffffff', border: '1px solid #e2e8f0', color: '#334155',
                fontWeight: '600', padding: '0.45rem 0.85rem', borderRadius: '8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" /></svg>
              Đồng bộ tức thời
            </button>
            <button
              onClick={() => exportTicketManagerToExcel(shifts, proposals, pendingLeaves, branchInfo?.name)}
              className="btn"
              style={{
                backgroundColor: '#2563eb', border: 'none', color: '#ffffff',
                fontWeight: '700', padding: '0.45rem 0.95rem', borderRadius: '8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
              Xuất báo cáo Excel
            </button>
          </div>
        </div>

        {/* 4 Stat Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.85rem' }}>
          {/* Card 1: Doanh thu vé quầy */}
          <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>DOANH THU QUẦY HÔM NAY</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0f172a', marginBottom: '2px', lineHeight: '1.2' }}>
              {todayRevenue.toLocaleString('vi-VN')} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>VNĐ</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: '600' }}>
              <span>Tiền mặt: {todayCash.toLocaleString('vi-VN')}đ | QR: {todayQr.toLocaleString('vi-VN')}đ</span>
            </div>
          </div>

          {/* Card 2: Vé bán tại quầy */}
          <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>VÉ PHÁT HÀNH TẠI QUẦY</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"/></svg>
              </div>
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0f172a', marginBottom: '2px', lineHeight: '1.2' }}>
              {todayTicketsCount} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>vé hôm nay</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#059669', fontWeight: '600' }}>
              Giao dịch thanh toán trực tiếp thành công
            </div>
          </div>

          {/* Card 3: Ca trực quầy */}
          <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>CA TRỰC &amp; QUÂN SỐ QUẦY</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0f172a', marginBottom: '2px', lineHeight: '1.2' }}>
              {activeShiftsCount} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>quầy đang mở</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
              Tổng {ticketAgents.length} nhân viên bán vé quầy
            </div>
          </div>

          {/* Card 4: Chờ duyệt */}
          <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>HÀNG CHỜ PHÊ DUYỆT</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: pendingLeaves.length > 0 ? '#dc2626' : '#0f172a', marginBottom: '2px', lineHeight: '1.2' }}>
              {pendingLeaves.length} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>đơn nghỉ</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: '600' }}>
              {pendingProposalsCount} đề xuất giá đang gửi Giám đốc
            </div>
          </div>
        </div>
      </div>

      {/* Middle Panels: Live Counters & High Demand Routes */}
      <section style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '0.85rem', marginBottom: '0.85rem' }}>
        {/* Panel Left: Giám sát quầy vé thời gian thực */}
        <div className="panel" style={{ background: '#ffffff', padding: '1.1rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <h2 style={{ fontSize: '0.92rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Giám Sát Ca Trực Quầy Vé Hôm Nay</h2>
            </div>
            <button
              onClick={() => setActiveTab && setActiveTab('ticket-attendance')}
              style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer' }}
            >
              Xem tất cả ca trực &rarr;
            </button>
          </div>

          {shifts.slice(0, 5).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.82rem' }}>
              Chưa có phiên ca trực nào được mở hôm nay.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {shifts.slice(0, 5).map(shift => {
                const isActive = shift.status === 'active';
                const total = (shift.cashRevenue || 0) + (shift.cashlessRevenue || 0);
                return (
                  <div
                    key={shift._id}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #f1f5f9',
                      background: isActive ? '#f0fdf4' : '#f8fafc'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#0f172a' }}>
                          {shift.userId?.assignedOffice || shift.officeName || 'Văn phòng bán vé'}
                        </span>
                        <span style={{
                          fontSize: '0.62rem', fontWeight: '700', padding: '1px 6px', borderRadius: '10px',
                          background: isActive ? '#dcfce7' : '#e2e8f0',
                          color: isActive ? '#15803d' : '#475569'
                        }}>
                          {isActive ? 'ĐANG MỞ BÁN' : 'ĐÃ KẾT CA'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                        Nhân viên: <strong style={{ color: '#334155' }}>{shift.userId?.name || 'N/A'}</strong> | Mở lúc: {new Date(shift.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a' }}>
                        {total.toLocaleString('vi-VN')} đ
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: '600' }}>
                        {shift.ticketsSold?.length || 0} vé bán ra
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Panel Right: Tuyến xe bán chạy & Đề xuất giá nhanh */}
        <div className="panel" style={{ background: '#ffffff', padding: '1.1rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
              <h2 style={{ fontSize: '0.92rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Tuyến Xe Quầy Bán Chạy</h2>
            </div>
            <button
              onClick={() => setActiveTab && setActiveTab('ticket-proposals')}
              style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer' }}
            >
              Tạo đề xuất giá &rarr;
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {recentTrips.slice(0, 4).map(trip => {
              const routeName = trip.routeId?.name || (trip.routeId ? `${trip.routeId.startPoint} -> ${trip.routeId.endPoint}` : 'Tuyến liên tỉnh');
              const booked = trip.bookedSeats?.length || 0;
              const totalSeats = trip.busId?.totalSeats || 40;
              const fillPct = Math.round((booked / totalSeats) * 100);

              return (
                <div key={trip._id} style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#ffffff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#0f172a' }}>{routeName}</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#2563eb' }}>{(trip.price || 0).toLocaleString('vi-VN')} đ</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                      Đã đặt: <strong>{booked}/{totalSeats} ghế</strong> ({fillPct}%)
                    </div>
                    <button
                      onClick={() => setActiveTab && setActiveTab('ticket-proposals')}
                      style={{
                        padding: '2px 8px', fontSize: '0.65rem', fontWeight: '700',
                        color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe',
                        borderRadius: '6px', cursor: 'pointer'
                      }}
                    >
                      Đề xuất giá
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Quick Access Toolbar */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.85rem' }}>
        <button
          onClick={() => setActiveTab && setActiveTab('ticket-staff')}
          style={{
            background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px',
            padding: '0.85rem', display: 'flex', alignItems: 'center', gap: '10px',
            cursor: 'pointer', textAlign: 'left', boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#0f172a' }}>Nhân Viên Bán Vé</div>
            <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Hồ sơ &amp; sinh trắc học</div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab && setActiveTab('ticket-leaves')}
          style={{
            background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px',
            padding: '0.85rem', display: 'flex', alignItems: 'center', gap: '10px',
            cursor: 'pointer', textAlign: 'left', boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#0f172a' }}>Duyệt Đơn Nghỉ</div>
            <div style={{ fontSize: '0.68rem', color: pendingLeaves.length > 0 ? '#dc2626' : '#64748b', fontWeight: pendingLeaves.length > 0 ? '700' : 'normal' }}>
              {pendingLeaves.length} đơn đang chờ duyệt
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab && setActiveTab('ticket-attendance')}
          style={{
            background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px',
            padding: '0.85rem', display: 'flex', alignItems: 'center', gap: '10px',
            cursor: 'pointer', textAlign: 'left', boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#0f172a' }}>Đối Soát Ca &amp; Quỹ</div>
            <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Chấm công &amp; Giao ca quầy</div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab && setActiveTab('ticket-proposals')}
          style={{
            background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px',
            padding: '0.85rem', display: 'flex', alignItems: 'center', gap: '10px',
            cursor: 'pointer', textAlign: 'left', boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#0f172a' }}>Đề Xuất Giá Vé</div>
            <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Gửi Ban Giám Đốc</div>
          </div>
        </button>
      </section>
    </>
  );
};

export default TicketManagerOverview;
