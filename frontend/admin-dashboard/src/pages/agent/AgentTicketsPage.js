import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const AgentTicketsPage = () => {
  const { token, user } = useContext(AuthContext);

  // Helper chuyển đổi ngày sang YYYY-MM-DD chuẩn local
  const formatDateToYMD = (dateObj) => {
    if (!dateObj) return '';
    const d = new Date(dateObj);
    if (isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const todayStr = formatDateToYMD(new Date());
  const tomorrowStr = formatDateToYMD(new Date(Date.now() + 86400000));
  const dayAfterTomorrowStr = formatDateToYMD(new Date(Date.now() + 86400000 * 2));

  // Search & Filter parameters
  const [searchQuery, setSearchQuery] = useState('');
  const [departureDate, setDepartureDate] = useState(() => todayStr);
  const [dateType, setDateType] = useState('both'); // 'both', 'departure', 'booking'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'paid', 'pending', 'cancelled'

  // Pagination state: Mỗi lượt xem hiển thị cố định đúng 10 dòng
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Data states
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Shift status
  const [activeShift, setActiveShift] = useState(null);

  // Modals
  const [detailTarget, setDetailTarget] = useState(null);
  const [cancellationTarget, setCancellationTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [printTarget, setPrintTarget] = useState(null);

  // Lấy thông tin ca trực quầy hiện tại
  const fetchShiftStatus = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/users/shift/current', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActiveShift(data.session);
      } else {
        setActiveShift(null);
      }
    } catch (err) {
      console.warn('Không thể nạp thông tin ca trực:', err);
    }
  };

  // Nạp danh sách vé từ CSDL
  const fetchBookings = async (query = searchQuery, date = departureDate, dType = dateType, st = statusFilter) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (query && query.trim()) {
        params.append('query', query.trim());
      }
      if (date && date.trim()) {
        params.append('date', date.trim());
        params.append('dateType', dType);
      }
      if (st && st !== 'all') {
        params.append('status', st);
      }

      const res = await fetch(`http://localhost:8000/api/v1/users/agent/tickets?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBookings(data.bookings || []);
      } else {
        setError(data.message || 'Không thể tải danh sách vé từ máy chủ.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ khi nạp dữ liệu vé.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShiftStatus();
    fetchBookings(searchQuery, departureDate, dateType, statusFilter);
  }, [token]);

  // Xử lý khi nhấn nút Tra cứu hoặc bấm Enter
  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setCurrentPage(1);
    fetchBookings(searchQuery, departureDate, dateType, statusFilter);
  };

  // Đổi ngày nhanh
  const handleQuickDate = (dateVal) => {
    setDepartureDate(dateVal);
    setCurrentPage(1);
    fetchBookings(searchQuery, dateVal, dateType, statusFilter);
  };

  // Đổi trạng thái
  const handleStatusChange = (newStatus) => {
    setStatusFilter(newStatus);
    setCurrentPage(1);
    fetchBookings(searchQuery, departureDate, dateType, newStatus);
  };

  // Đổi kiểu ngày
  const handleDateTypeChange = (newType) => {
    setDateType(newType);
    setCurrentPage(1);
    fetchBookings(searchQuery, departureDate, newType, statusFilter);
  };

  // Reset bộ lọc
  const handleResetFilters = () => {
    setSearchQuery('');
    setDepartureDate('');
    setDateType('both');
    setStatusFilter('all');
    setCurrentPage(1);
    fetchBookings('', '', 'both', 'all');
  };

  // Mở modal xác nhận hủy vé
  const handleOpenCancelConfirmation = (booking) => {
    setCancellationTarget(booking);
    setError('');
    setSuccess('');
  };

  // Thực thi hủy vé và hoàn tiền
  const handleExecuteCancellation = async () => {
    if (!cancellationTarget) return;

    setCancelling(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`http://localhost:8000/api/v1/users/agent/cancel-ticket/${cancellationTarget._id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(`Hủy vé thành công! Mã vé ${cancellationTarget.orderCode} đã giải phóng ghế. Phí hủy: ${formatCurrency(data.refundSummary?.cancellationFee || 0)}, tiền hoàn trả: ${formatCurrency(data.refundSummary?.refundAmount || 0)}.`);
        setCancellationTarget(null);
        fetchBookings(searchQuery, departureDate, dateType, statusFilter);
      } else {
        setError(data.message || 'Hủy vé thất bại.');
      }
    } catch (err) {
      setError('Lỗi máy chủ khi hủy vé.');
    } finally {
      setCancelling(false);
    }
  };

  const formatCurrency = (number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(number || 0);
  };

  // Thống kê nhanh
  const stats = {
    totalTickets: bookings.reduce((sum, b) => sum + (b.seats?.length || 0), 0),
    totalOrders: bookings.length,
    paidCount: bookings.filter(b => b.status === 'paid').length,
    pendingCount: bookings.filter(b => b.status === 'pending').length,
    cancelledCount: bookings.filter(b => b.status === 'cancelled').length,
    totalRevenue: bookings
      .filter(b => b.status === 'paid')
      .reduce((sum, b) => sum + (b.totalAmount || ((b.tripId?.price || 0) * (b.seats?.length || 0))), 0)
  };

  // Logic phân trang chuẩn 10 dòng
  const totalItems = bookings.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const currentBookings = bookings.slice(startIndex, endIndex);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>

      {/* CSS Cục Bộ Chuẩn Giao Diện Bán Vé & Quản Lý - Đồng Bộ Kích Thước Tuyệt Đối & Không Dùng Icon */}
      <style>{`
        .agent-panel-box {
          background: #ffffff;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          padding: 1.25rem 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .agent-header-wrap {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .agent-pill-btn {
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #475569;
          padding: 5px 12px;
          border-radius: 6px;
          font-size: 0.76rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
        }

        .agent-pill-btn:hover {
          border-color: #2563eb;
          color: #2563eb;
          background: #f8fafc;
        }

        .agent-pill-btn.active {
          border-color: #2563eb;
          background: #2563eb;
          color: #ffffff;
        }

        .agent-form-control {
          height: 40px;
          padding: 0 0.85rem;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 0.82rem;
          color: #0f172a;
          outline: none;
          background: #ffffff;
          transition: border-color 0.15s;
        }

        .agent-form-control:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        /* Lưới thống kê 4 cột cố định đồng kích thước */
        .agent-stat-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.75rem;
        }

        @media (max-width: 960px) {
          .agent-stat-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 520px) {
          .agent-stat-grid {
            grid-template-columns: 1fr;
          }
        }

        .stat-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 0.85rem 1.15rem;
          box-sizing: border-box;
          min-height: 80px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        /* Bảng cố định tỷ lệ cột table-layout: fixed vừa khít 100%, không thanh cuộn ngang */
        .agent-table-wrapper {
          width: 100%;
          overflow: hidden;
          background: #ffffff;
        }

        .agent-table {
          width: 100%;
          table-layout: fixed;
          border-collapse: collapse;
          font-size: 0.8rem;
        }

        .agent-table th {
          background: #f8fafc;
          color: #475569;
          font-weight: 700;
          padding: 0.75rem 0.65rem;
          border-bottom: 2px solid #e2e8f0;
          text-align: left;
          white-space: nowrap;
          box-sizing: border-box;
          font-size: 0.78rem;
        }

        .agent-table td {
          padding: 0.75rem 0.65rem;
          border-bottom: 1px solid #f1f5f9;
          color: #1e293b;
          vertical-align: middle;
          box-sizing: border-box;
          word-break: break-word;
          line-height: 1.35;
        }

        .agent-table tbody tr:hover {
          background-color: #f8fafc;
        }

        .badge-status {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 0.72rem;
          font-weight: 700;
          white-space: nowrap;
        }

        .badge-paid {
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
        }

        .badge-pending {
          background: #fffbeb;
          color: #b45309;
          border: 1px solid #fde68a;
        }

        .badge-cancelled {
          background: #fef2f2;
          color: #b91c1c;
          border: 1px solid #fecaca;
        }

        .badge-boarded {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
        }

        .badge-not-boarded {
          background: #f1f5f9;
          color: #64748b;
          border: 1px solid #cbd5e1;
        }

        .btn-action {
          padding: 3px 6px;
          border-radius: 4px;
          font-size: 0.71rem;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid transparent;
          transition: all 0.15s;
          white-space: nowrap;
        }

        .btn-action-primary {
          background: #eff6ff;
          color: #2563eb;
          border-color: #bfdbfe;
        }

        .btn-action-primary:hover {
          background: #2563eb;
          color: #ffffff;
        }

        .btn-action-detail {
          background: #f8fafc;
          color: #334155;
          border-color: #cbd5e1;
        }

        .btn-action-detail:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        .btn-action-danger {
          background: #fef2f2;
          color: #dc2626;
          border-color: #fecaca;
        }

        .btn-action-danger:hover {
          background: #dc2626;
          color: #ffffff;
        }

        .btn-action-danger:disabled {
          background: #f1f5f9;
          color: #94a3b8;
          border-color: #e2e8f0;
          cursor: not-allowed;
        }

        /* Nút phân trang đồng bộ */
        .agent-page-btn {
          height: 32px;
          min-width: 32px;
          padding: 0 10px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #334155;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
          user-select: none;
        }

        .agent-page-btn:hover:not(:disabled) {
          border-color: #2563eb;
          color: #2563eb;
          background: #f8fafc;
        }

        .agent-page-btn.active {
          background: #2563eb;
          border-color: #2563eb;
          color: #ffffff;
        }

        .agent-page-btn:disabled {
          background: #f8fafc;
          border-color: #e2e8f0;
          color: #94a3b8;
          cursor: not-allowed;
        }
      `}</style>

      {/* ========================================================= */}
      {/* KHỐI 1: TIÊU ĐỀ & TRẠNG THÁI CA TRỰC QUẦY                */}
      {/* ========================================================= */}
      <div className="agent-panel-box">
        <div className="agent-header-wrap">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Tra Cứu & Quản Lý Vé Tại Quầy
              </h1>
              <span style={{
                background: '#eff6ff',
                color: '#2563eb',
                border: '1px solid #bfdbfe',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.68rem',
                fontWeight: '700'
              }}>
                Nhân Viên Bán Vé
              </span>
            </div>

            <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '6px' }}>
              {activeShift ? (
                <span>
                  Đang mở ca tại: <strong style={{ color: '#0f172a' }}>{activeShift.counterNumber}</strong>
                  <span style={{ margin: '0 8px', color: '#cbd5e1' }}>•</span>
                  Bắt đầu: <strong style={{ color: '#0f172a' }}>{new Date(activeShift.startTime).toLocaleTimeString('vi-VN')}</strong> ({new Date(activeShift.startTime).toLocaleDateString('vi-VN')})
                </span>
              ) : (
                <span style={{ color: '#b45309' }}>
                  Chưa ghi nhận ca trực quầy hôm nay. Vui lòng mở ca để liên kết thao tác hủy và hoàn vé.
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => fetchBookings(searchQuery, departureDate, dateType, statusFilter)}
              style={{
                backgroundColor: '#2563eb',
                border: 'none',
                color: '#ffffff',
                fontWeight: '700',
                padding: '0.5rem 1.15rem',
                borderRadius: '8px',
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
              title="Tải lại danh sách vé từ CSDL"
            >
              Làm Mới Dữ Liệu
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c', padding: '0.65rem 1rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '600' }}>
            Lưu ý: {error}
          </div>
        )}

        {success && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', padding: '0.65rem 1rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '600' }}>
            Thành công: {success}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* KHỐI 2: BỘ LỌC TÌM KIẾM VÀ CHỌN NGÀY                      */}
      {/* ========================================================= */}
      <div className="agent-panel-box">

        {/* Dòng 1: Thanh tìm kiếm theo SĐT, Mã vé, Tên khách */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem', alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
              Tra cứu nhanh hành khách hoặc vé
            </label>
            <input
              type="text"
              className="agent-form-control"
              style={{ width: '100%' }}
              placeholder="Nhập Số điện thoại, Mã vé (6 chữ số), Tên hành khách hoặc Biển số xe..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                height: '40px',
                padding: '0 1.25rem',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              {loading ? 'Đang tìm...' : 'Tra Cứu'}
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                height: '40px',
                padding: '0 1rem',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
              title="Đặt lại tất cả bộ lọc về mặc định"
            >
              Xem Tất Cả
            </button>
          </div>
        </form>

        {/* Dòng 2: Chọn ngày nhanh & Ngày cụ thể & Kiểu ngày */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.85rem' }}>

          {/* Nút chọn ngày */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', marginRight: '4px' }}>Chọn ngày:</span>
            <button
              type="button"
              className={`agent-pill-btn ${departureDate === '' ? 'active' : ''}`}
              onClick={() => handleQuickDate('')}
            >
              Tất Cả Ngày
            </button>
            <button
              type="button"
              className={`agent-pill-btn ${departureDate === todayStr ? 'active' : ''}`}
              onClick={() => handleQuickDate(todayStr)}
            >
              Hôm Nay
            </button>
            <button
              type="button"
              className={`agent-pill-btn ${departureDate === tomorrowStr ? 'active' : ''}`}
              onClick={() => handleQuickDate(tomorrowStr)}
            >
              Ngày Mai
            </button>
            <button
              type="button"
              className={`agent-pill-btn ${departureDate === dayAfterTomorrowStr ? 'active' : ''}`}
              onClick={() => handleQuickDate(dayAfterTomorrowStr)}
            >
              Ngày Kia
            </button>

            <input
              type="date"
              value={departureDate}
              onChange={(e) => handleQuickDate(e.target.value)}
              style={{
                height: '32px',
                padding: '0 8px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '0.75rem',
                color: '#0f172a',
                outline: 'none',
                background: '#ffffff'
              }}
              title="Chọn ngày tùy ý"
            />
          </div>

          {/* Tiêu chí lọc ngày */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', marginRight: '4px' }}>Tiêu chí ngày:</span>
            <button
              type="button"
              className={`agent-pill-btn ${dateType === 'both' ? 'active' : ''}`}
              onClick={() => handleDateTypeChange('both')}
            >
              Cả Chuyến Đi & Đặt Vé
            </button>
            <button
              type="button"
              className={`agent-pill-btn ${dateType === 'departure' ? 'active' : ''}`}
              onClick={() => handleDateTypeChange('departure')}
            >
              Ngày Khởi Hành Chuyến
            </button>
            <button
              type="button"
              className={`agent-pill-btn ${dateType === 'booking' ? 'active' : ''}`}
              onClick={() => handleDateTypeChange('booking')}
            >
              Ngày Xuất Vé
            </button>
          </div>

        </div>

        {/* Dòng 3: Lọc theo trạng thái thanh toán */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', marginRight: '4px' }}>Trạng thái vé:</span>
            <button
              type="button"
              className={`agent-pill-btn ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => handleStatusChange('all')}
            >
              Tất Cả ({stats.totalOrders})
            </button>
            <button
              type="button"
              className={`agent-pill-btn ${statusFilter === 'paid' ? 'active' : ''}`}
              onClick={() => handleStatusChange('paid')}
            >
              Đã Thanh Toán ({stats.paidCount})
            </button>
            <button
              type="button"
              className={`agent-pill-btn ${statusFilter === 'pending' ? 'active' : ''}`}
              onClick={() => handleStatusChange('pending')}
            >
              Chờ Thanh Toán ({stats.pendingCount})
            </button>
            <button
              type="button"
              className={`agent-pill-btn ${statusFilter === 'cancelled' ? 'active' : ''}`}
              onClick={() => handleStatusChange('cancelled')}
            >
              Đã Hủy ({stats.cancelledCount})
            </button>
          </div>

        </div>

      </div>

      {/* ========================================================= */}
      {/* KHỐI 3: THỐNG KÊ 4 CỘT CỐ ĐỊNH KÍCH THƯỚC ĐỒNG BỘ         */}
      {/* ========================================================= */}
      <div className="agent-stat-grid">
        <div className="stat-card">
          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Số Đơn / Vé</div>
          <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
            {stats.totalOrders} đơn <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: '500' }}>({stats.totalTickets} vé)</span>
          </div>
        </div>

        <div className="stat-card">
          <div style={{ fontSize: '0.72rem', color: '#047857', fontWeight: '700', textTransform: 'uppercase' }}>Đã Thanh Toán</div>
          <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#047857', marginTop: '2px' }}>
            {stats.paidCount} đơn
          </div>
        </div>

        <div className="stat-card">
          <div style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: '700', textTransform: 'uppercase' }}>Tổng Doanh Thu</div>
          <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#2563eb', marginTop: '2px' }}>
            {formatCurrency(stats.totalRevenue)}
          </div>
        </div>

        <div className="stat-card">
          <div style={{ fontSize: '0.72rem', color: '#b91c1c', fontWeight: '700', textTransform: 'uppercase' }}>Vé Đã Hủy</div>
          <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#b91c1c', marginTop: '2px' }}>
            {stats.cancelledCount} đơn
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* KHỐI 4: BẢNG VÉ ĐỒNG BỘ KÍCH THƯỚC & PHÂN TRANG 10 DÒNG   */}
      {/* ========================================================= */}
      <div className="agent-panel-box" style={{ padding: '0', overflow: 'hidden' }}>

        {/* Tiêu đề bảng - Cố định cấu trúc, không nhảy layout */}
        <div style={{ padding: '0.95rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', minHeight: '56px', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Danh Sách Vé Đã Đặt
            </h2>
            <span style={{
              background: departureDate ? '#eff6ff' : '#f1f5f9',
              color: departureDate ? '#2563eb' : '#475569',
              border: `1px solid ${departureDate ? '#bfdbfe' : '#cbd5e1'}`,
              padding: '2px 8px',
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontWeight: '700'
            }}>
              {departureDate
                ? (departureDate === todayStr ? `Hôm Nay (${new Date(departureDate + 'T00:00:00').toLocaleDateString('vi-VN')})` : departureDate === tomorrowStr ? `Ngày Mai (${new Date(departureDate + 'T00:00:00').toLocaleDateString('vi-VN')})` : `Ngày ${new Date(departureDate + 'T00:00:00').toLocaleDateString('vi-VN')}`)
                : 'Tất Cả Các Ngày'}
            </span>
          </div>

          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>
            {totalItems > 0 ? (
              <span>Hiển thị <strong>{startIndex + 1} - {endIndex}</strong> trên <strong>{totalItems}</strong> đơn vé</span>
            ) : (
              <span>0 đơn vé</span>
            )}
          </div>
        </div>

        {/* Nội dung bảng */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#64748b' }}>
            <div style={{ fontWeight: '700', fontSize: '0.88rem' }}>Đang nạp dữ liệu vé từ hệ thống...</div>
          </div>
        ) : totalItems === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: '#64748b' }}>
            <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
              Không tìm thấy vé xe nào phù hợp
            </div>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 1rem 0' }}>
              {departureDate
                ? `Không có vé nào được ghi nhận cho ngày ${new Date(departureDate + 'T00:00:00').toLocaleDateString('vi-VN')}.`
                : 'Chưa có thông tin vé nào khớp với tiêu chí tra cứu.'}
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                padding: '0.45rem 1rem',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                border: '1px solid #bfdbfe',
                borderRadius: '6px',
                fontSize: '0.76rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Xem toàn bộ vé trong hệ thống
            </button>
          </div>
        ) : (
          <div className="agent-table-wrapper">
            <table className="agent-table">
              {/* Định nghĩa tỷ lệ cố định 100% cho các cột: Vừa khít bảng, không cuộn ngang */}
              <colgroup>
                <col style={{ width: '10%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '25%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '18%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Mã Vé</th>
                  <th>Hành Khách</th>
                  <th>Lịch Trình & Chuyến Xe</th>
                  <th>Ghế & Tiền Vé</th>
                  <th>Trạng Thái</th>
                  <th>Lên Xe</th>
                  <th style={{ textAlign: 'right' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {currentBookings.map((booking) => {
                  const trip = booking.tripId;
                  const route = trip?.routeId;
                  const bus = trip?.busId;
                  const departureTime = trip?.departureTime ? new Date(trip.departureTime) : null;
                  const createdTime = new Date(booking.createdAt);
                  const totalSeats = booking.seats?.length || 0;
                  const totalCost = booking.totalAmount || ((trip?.price || 0) * totalSeats);

                  return (
                    <tr key={booking._id}>
                      {/* Cột 1: Mã Vé (11%) */}
                      <td>
                        <div style={{ fontWeight: '800', color: '#2563eb', fontSize: '0.92rem' }}>
                          #{booking.orderCode || booking._id.slice(-6).toUpperCase()}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                          Đặt: {createdTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ({createdTime.toLocaleDateString('vi-VN')})
                        </div>
                      </td>

                      {/* Cột 2: Hành Khách (18%) */}
                      <td>
                        <div style={{ fontWeight: '700', color: '#0f172a' }}>
                          {booking.customerName}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#475569', marginTop: '2px' }}>
                          SĐT: {booking.customerPhone}
                        </div>
                        {booking.customerCCCD && booking.customerCCCD !== 'COUNTER_BOOKING' && (
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                            CCCD: {booking.customerCCCD}
                          </div>
                        )}
                      </td>

                      {/* Cột 3: Lịch Trình (25%) */}
                      <td>
                        {route ? (
                          <div>
                            <div style={{ fontWeight: '700', color: '#0f172a' }}>
                              {route.startPoint} ⇄ {route.endPoint}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#2563eb', fontWeight: '600', marginTop: '2px' }}>
                              Xuất bến: {departureTime ? `${departureTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ngày ${departureTime.toLocaleDateString('vi-VN')}` : 'N/A'}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              Xe: {bus?.plateNumber || 'Chưa gán'} ({bus?.type || 'Tiêu chuẩn'})
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>Chưa có thông tin chuyến</span>
                        )}
                      </td>

                      {/* Cột 4: Ghế & Tiền Vé (14%) */}
                      <td>
                        <div style={{ fontWeight: '800', color: '#0f172a' }}>
                          {booking.seats?.join(', ')}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          {totalSeats} ghế ({formatCurrency(trip?.price || 0)}/ghế)
                        </div>
                        <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#047857', marginTop: '2px' }}>
                          {formatCurrency(totalCost)}
                        </div>
                      </td>

                      {/* Cột 5: Trạng Thái Thanh Toán (10%) */}
                      <td>
                        {booking.status === 'paid' && (
                          <span className="badge-status badge-paid">Đã Thanh Toán</span>
                        )}
                        {booking.status === 'pending' && (
                          <span className="badge-status badge-pending">Chờ Thanh Toán</span>
                        )}
                        {booking.status === 'cancelled' && (
                          <span className="badge-status badge-cancelled">Đã Hủy Vé</span>
                        )}
                      </td>

                      {/* Cột 6: Trạng Thái Lên Xe (8%) */}
                      <td>
                        {booking.boarded ? (
                          <span className="badge-status badge-boarded">Đã Lên Xe</span>
                        ) : (
                          <span className="badge-status badge-not-boarded">Chưa Lên Xe</span>
                        )}
                      </td>

                      {/* Cột 7: Thao Tác (18%) */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                          <button
                            type="button"
                            className="btn-action btn-action-primary"
                            onClick={() => setPrintTarget(booking)}
                            title="In hóa đơn / biên lai nhiệt POS"
                          >
                            In Vé
                          </button>

                          <button
                            type="button"
                            className="btn-action btn-action-detail"
                            onClick={() => setDetailTarget(booking)}
                            title="Xem chi tiết đón trả và thanh toán"
                          >
                            Chi Tiết
                          </button>

                          {booking.status !== 'cancelled' && (
                            <button
                              type="button"
                              className="btn-action btn-action-danger"
                              disabled={!activeShift}
                              onClick={() => handleOpenCancelConfirmation(booking)}
                              title={!activeShift ? 'Vui lòng mở ca trực để thực hiện hủy vé' : 'Hủy vé và hoàn tiền theo quy định'}
                            >
                              Hủy Vé
                            </button>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Thanh Phân Trang Đồng Bộ: 10 Dòng / Lượt Xem */}
        {totalItems > 0 && (
          <div style={{
            padding: '0.85rem 1.25rem',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
            background: '#ffffff'
          }}>
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Trang <strong>{currentPage}</strong> / <strong>{totalPages}</strong> (Hiển thị 10 dòng mỗi trang)
            </div>

            {totalPages > 1 && (
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  className="agent-page-btn"
                  title="Về trang đầu"
                >
                  Trang Đầu
                </button>
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="agent-page-btn"
                  title="Trang trước"
                >
                  Trước
                </button>

                {/* Các nút số trang */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || (p >= currentPage - 2 && p <= currentPage + 2))
                  .map((p, idx, arr) => {
                    const prevP = arr[idx - 1];
                    return (
                      <React.Fragment key={p}>
                        {prevP && p - prevP > 1 && (
                          <span style={{ padding: '0 4px', color: '#94a3b8', fontSize: '0.75rem' }}>...</span>
                        )}
                        <button
                          type="button"
                          onClick={() => setCurrentPage(p)}
                          className={`agent-page-btn ${currentPage === p ? 'active' : ''}`}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    );
                  })}

                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="agent-page-btn"
                  title="Trang kế tiếp"
                >
                  Sau
                </button>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="agent-page-btn"
                  title="Đến trang cuối"
                >
                  Trang Cuối
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ========================================================= */}
      {/* MODAL 1: CHI TIẾT ĐƠN ĐẶT VÉ (KHÔNG DÙNG ICON)            */}
      {/* ========================================================= */}
      {detailTarget && (
        <div className="modal-backdrop" onClick={() => setDetailTarget(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ backgroundColor: '#ffffff', borderRadius: '14px', width: '100%', maxWidth: '540px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)', overflow: 'hidden' }}>

            {/* Header modal cố định không co rút */}
            <div style={{ flexShrink: 0, padding: '0.85rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#0f172a' }}>
                  Chi Tiết Vé Xe #{detailTarget.orderCode || detailTarget._id.slice(-6).toUpperCase()}
                </h3>
                <span style={{ fontSize: '0.73rem', color: '#64748b' }}>
                  Thời gian tạo: {new Date(detailTarget.createdAt).toLocaleString('vi-VN')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDetailTarget(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', color: '#64748b', cursor: 'pointer', padding: '4px 8px' }}
              >
                &times;
              </button>
            </div>

            {/* Thân modal cuộn độc lập mượt mà, không đè nút */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.82rem' }}>

              {/* Thông tin khách hàng */}
              <div style={{ background: '#f8fafc', padding: '0.8rem 0.95rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>Thông Tin Hành Khách</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <div>Họ tên: <strong>{detailTarget.customerName}</strong></div>
                  <div>Số điện thoại: <strong>{detailTarget.customerPhone}</strong></div>
                  <div>Năm sinh: <strong>{detailTarget.customerBirthYear || 'N/A'}</strong></div>
                  <div>CCCD: <strong>{detailTarget.customerCCCD || 'N/A'}</strong></div>
                  {detailTarget.customerEmail && (
                    <div style={{ gridColumn: 'span 2' }}>Email: <strong>{detailTarget.customerEmail}</strong></div>
                  )}
                </div>
              </div>

              {/* Thông tin hành trình */}
              <div style={{ background: '#f8fafc', padding: '0.8rem 0.95rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>Hành Trình & Chuyến Xe</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div>Tuyến: <strong>{detailTarget.tripId?.routeId?.startPoint} ⇄ {detailTarget.tripId?.routeId?.endPoint}</strong></div>
                  <div>Khởi hành: <strong>{detailTarget.tripId?.departureTime ? `${new Date(detailTarget.tripId.departureTime).toLocaleTimeString('vi-VN')} ngày ${new Date(detailTarget.tripId.departureTime).toLocaleDateString('vi-VN')}` : 'N/A'}</strong></div>
                  <div>Phương tiện: <strong>{detailTarget.tripId?.busId?.plateNumber} ({detailTarget.tripId?.busId?.type})</strong></div>
                  <div>Điểm đón: <strong>{detailTarget.pickup}</strong></div>
                  <div>Điểm trả: <strong>{detailTarget.dropoff}</strong></div>
                </div>
              </div>

              {/* Ghế và thanh toán */}
              <div style={{ background: '#f8fafc', padding: '0.8rem 0.95rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>Ghế Ngồi & Thanh Toán</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <div>Danh sách ghế: <strong style={{ color: '#2563eb' }}>{detailTarget.seats?.join(', ')}</strong></div>
                  <div>Số lượng: <strong>{detailTarget.seats?.length} ghế</strong></div>
                  <div>Giá vé: <strong>{formatCurrency(detailTarget.tripId?.price || 0)} / ghế</strong></div>
                  <div>Tổng thanh toán: <strong style={{ color: '#047857', fontSize: '0.92rem' }}>{formatCurrency(detailTarget.totalAmount || ((detailTarget.tripId?.price || 0) * (detailTarget.seats?.length || 0)))}</strong></div>
                  <div>Hình thức: <strong>{detailTarget.paymentType === 'immediate' ? 'Thanh toán ngay' : 'Thanh toán sau'}</strong></div>
                  <div>Trạng thái: <strong>{detailTarget.status === 'paid' ? 'Đã thanh toán' : detailTarget.status === 'cancelled' ? 'Đã hủy' : 'Chờ thanh toán'}</strong></div>
                </div>
              </div>

              {/* QR Soát vé */}
              {detailTarget.qrSignature && detailTarget.status !== 'cancelled' && (
                <div style={{ textAlign: 'center', padding: '0.75rem', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>MÃ QR SOÁT VÉ LÊN XE</div>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(
                      JSON.stringify({ ticketId: detailTarget._id, signature: detailTarget.qrSignature })
                    )}`}
                    alt="Mã QR Soát Vé"
                    style={{ width: '130px', height: '130px', display: 'inline-block' }}
                  />
                  <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '6px' }}>
                    Chữ ký bảo mật: {detailTarget.qrSignature}
                  </div>
                </div>
              )}

            </div>

            {/* Footer modal cố định luôn luôn hiển thị trọn vẹn, không bao giờ bị cắt chữ */}
            <div style={{ flexShrink: 0, padding: '0.85rem 1.25rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '8px', background: '#f8fafc' }}>
              <button
                type="button"
                onClick={() => {
                  setPrintTarget(detailTarget);
                  setDetailTarget(null);
                }}
                style={{ padding: '0.45rem 1.15rem', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer' }}
              >
                In Vé Này
              </button>
              <button
                type="button"
                onClick={() => setDetailTarget(null)}
                style={{ padding: '0.45rem 1.15rem', backgroundColor: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer' }}
              >
                Đóng
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: HỦY VÉ & TÍNH PHÍ HOÀN TIỀN (KHÔNG DÙNG ICON)     */}
      {/* ========================================================= */}
      {cancellationTarget && (
        <div className="modal-backdrop" onClick={() => setCancellationTarget(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ backgroundColor: '#ffffff', borderRadius: '14px', width: '100%', maxWidth: '500px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)', overflow: 'hidden' }}>

            <div style={{ flexShrink: 0, padding: '0.85rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#dc2626' }}>
                Xác Nhận Hủy Vé & Hoàn Tiền
              </h3>
              <button
                type="button"
                onClick={() => setCancellationTarget(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', color: '#64748b', cursor: 'pointer', padding: '4px 8px' }}
              >
                &times;
              </button>
            </div>

            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.82rem' }}>
              <div style={{ backgroundColor: '#fff1f2', color: '#be123c', padding: '0.75rem', borderRadius: '6px', fontWeight: '600', fontSize: '0.78rem', border: '1px solid #fecdd3' }}>
                Lưu ý quan trọng: Yêu cầu này sẽ hủy vé đã chọn và giải phóng ghế ngồi tương ứng trở về sơ đồ chuyến xe.
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '700' }}>Mã vé hủy:</label>
                <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a' }}>
                  #{cancellationTarget.orderCode || cancellationTarget._id.slice(-6).toUpperCase()} (Khách hàng: {cancellationTarget.customerName})
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '700' }}>Thời gian khởi hành:</label>
                <div style={{ fontWeight: '700', color: '#0f172a' }}>
                  {cancellationTarget.tripId ? `${new Date(cancellationTarget.tripId.departureTime).toLocaleTimeString('vi-VN')} ngày ${new Date(cancellationTarget.tripId.departureTime).toLocaleDateString('vi-VN')}` : 'N/A'}
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span>Số lượng vé:</span>
                  <strong>{cancellationTarget.seats?.length} vé ({cancellationTarget.seats?.join(', ')})</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Tổng tiền thanh toán:</span>
                  <strong style={{ color: '#047857' }}>
                    {formatCurrency(cancellationTarget.totalAmount || ((cancellationTarget.tripId?.price || 0) * (cancellationTarget.seats?.length || 0)))}
                  </strong>
                </div>
              </div>

              <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>
                * Mức khấu trừ phí phạt và số tiền hoàn trả cho khách được hệ thống tự động tính dựa trên thời gian hủy so với giờ xuất bến theo quy định nhà xe.
              </div>
            </div>

            <div style={{ flexShrink: 0, padding: '0.85rem 1.25rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '8px', background: '#f8fafc' }}>
              <button
                type="button"
                className="agent-pill-btn"
                onClick={() => setCancellationTarget(null)}
                disabled={cancelling}
              >
                Quay Lại
              </button>
              <button
                type="button"
                style={{
                  padding: '0.45rem 1.15rem',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
                onClick={handleExecuteCancellation}
                disabled={cancelling}
              >
                {cancelling ? 'Đang xử lý...' : 'Xác Nhận Hủy & Hoàn Tiền'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: IN HÓA ĐƠN VÉ NHIỆT POS (KHÔNG DÙNG ICON)        */}
      {/* ========================================================= */}
      {printTarget && (
        <div className="modal-backdrop" onClick={() => setPrintTarget(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '380px', fontFamily: 'Courier New, monospace', color: '#000000', backgroundColor: '#ffffff', border: '2px solid #000000', padding: '1.5rem', borderRadius: '4px' }}>
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: '0 0 0.25rem 0', fontWeight: 'bold' }}>NHÀ XE AN BÌNH LINES</h3>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem' }}>MANG NIỀM TIN TRÊN MỌI NẺO ĐƯỜNG</p>
              <p style={{ margin: '0', fontSize: '0.75rem' }}>Hotline: 1900 8888</p>
              <div style={{ margin: '0.5rem 0', borderTop: '1px dashed #000000' }}></div>
              <h4 style={{ margin: '0.25rem 0', fontSize: '1rem', fontWeight: 'bold' }}>HÓA ĐƠN VÉ XE KIÊM BIÊN LAI</h4>
            </div>

            <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div><strong>Mã vé (Code): </strong> #{printTarget.orderCode || printTarget._id.slice(-6).toUpperCase()}</div>
              <div><strong>Hành khách: </strong> {printTarget.customerName}</div>
              <div><strong>SĐT: </strong> {printTarget.customerPhone}</div>
              <div style={{ margin: '0.25rem 0', borderTop: '1px dashed #000000' }}></div>
              {printTarget.tripId ? (
                <>
                  <div><strong>Tuyến đường: </strong> {printTarget.tripId.routeId?.startPoint} - {printTarget.tripId.routeId?.endPoint}</div>
                  <div><strong>Xuất phát: </strong> {new Date(printTarget.tripId.departureTime).toLocaleTimeString('vi-VN')} ({new Date(printTarget.tripId.departureTime).toLocaleDateString('vi-VN')})</div>
                  <div><strong>Xe khách: </strong> {printTarget.tripId.busId?.plateNumber} ({printTarget.tripId.busId?.type})</div>
                </>
              ) : null}
              <div><strong>Số ghế: </strong> {printTarget.seats?.join(', ')}</div>
              <div><strong>Số lượng: </strong> {printTarget.seats?.length} vé</div>
              <div style={{ margin: '0.25rem 0', borderTop: '1px dashed #000000' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 'bold' }}>
                <span>TỔNG TIỀN:</span>
                <span>{formatCurrency(printTarget.totalAmount || ((printTarget.tripId?.price || 0) * printTarget.seats?.length))}</span>
              </div>
              <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Trạng thái: {printTarget.status === 'cancelled' ? 'ĐÃ HỦY (CANCELLED)' : 'ĐÃ THANH TOÁN (COUNTER CLEAR)'}</div>
            </div>

            {/* Ticket Boarding QR Code */}
            {printTarget.qrSignature && printTarget.status !== 'cancelled' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '1rem', marginBottom: '0.5rem', textAlign: 'center' }}>
                <div style={{ border: '1px solid #000', padding: '4px', backgroundColor: '#fff', display: 'inline-block' }}>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
                      JSON.stringify({ ticketId: printTarget._id, signature: printTarget.qrSignature })
                    )}`}
                    alt="Vé QR Soát Vé"
                    style={{ width: '120px', height: '120px', display: 'block' }}
                  />
                </div>
                <div style={{ fontSize: '0.65rem', marginTop: '0.25rem', color: '#000', fontWeight: 'bold' }}>
                  MÃ QR SOÁT VÉ LÊN XE (HMAC SECURE)
                </div>
              </div>
            )}

            <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.75rem' }}>
              <p style={{ margin: '0 0 0.25rem 0' }}>Cảm ơn quý khách đã tin tưởng An Bình Lines!</p>
              <p style={{ margin: '0' }}>Chúc quý khách thượng lộ bình an!</p>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px dashed #000', marginTop: '1rem', paddingTop: '0.75rem', display: 'flex', justifyContent: 'center' }}>
              <button
                type="button"
                style={{ padding: '0.3rem 1rem', fontSize: '0.8rem', fontFamily: 'sans-serif', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                onClick={() => {
                  window.print();
                }}
              >
                In Hóa Đơn Trực Tiếp
              </button>
              <button
                type="button"
                style={{ padding: '0.3rem 1rem', fontSize: '0.8rem', fontFamily: 'sans-serif', marginLeft: '0.5rem', backgroundColor: '#e2e8f0', color: '#000000', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                onClick={() => setPrintTarget(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AgentTicketsPage;
