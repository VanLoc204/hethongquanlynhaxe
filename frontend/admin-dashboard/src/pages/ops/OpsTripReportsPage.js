import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import TripReportModal from '../../components/TripReportModal';

const OpsTripReportsPage = ({ role }) => {
  const { token, user } = useContext(AuthContext);
  const isAttendant = role === 'attendant' || user?.role === 'attendant';

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [dateFilter, setDateFilter] = useState('2026-11-07');
  const [statusFilter, setStatusFilter] = useState('all');
  const [submissionFilter, setSubmissionFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected report modal
  const [selectedReport, setSelectedReport] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [signingLoading, setSigningLoading] = useState(false);

  // Midnight auto check trigger loading
  const [autoChecking, setAutoChecking] = useState(false);

  useEffect(() => {
    fetchReports();
  }, [token, dateFilter, statusFilter, submissionFilter]);

  const fetchReports = async () => {
    setLoading(true);
    setError('');
    try {
      let queryParams = new URLSearchParams();
      if (dateFilter) queryParams.append('date', dateFilter);
      if (statusFilter && statusFilter !== 'all') queryParams.append('status', statusFilter);
      if (submissionFilter && submissionFilter !== 'all') queryParams.append('submissionType', submissionFilter);
      if (searchQuery) queryParams.append('search', searchQuery);

      const res = await fetch(`http://localhost:8000/api/users/ops/trip-reports?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setReports(data.reports || []);
      } else {
        setError(data.message || 'Không thể tải danh sách báo cáo chuyến xe.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ khi tải báo cáo: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchReports();
  };

  const handleOpenReportModal = (report) => {
    setSelectedReport(report);
    setIsModalOpen(true);
  };

  const handleSignReport = async (notes) => {
    if (!selectedReport) return;
    setSigningLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`http://localhost:8000/api/users/ops/trip-reports/${selectedReport._id}/sign`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          approvalStatus: 'approved',
          approvalNotes: notes || 'Đã kiểm tra đối soát danh sách hành khách thực tế lên xe và ký duyệt điện tử.'
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess('Ký duyệt điện tử báo cáo chuyến xe thành công!');
        setSelectedReport(data.report);
        // Cập nhật lại trong danh sách
        setReports(prev => prev.map(r => r._id === data.report._id ? data.report : r));
      } else {
        setError(data.message || 'Ký duyệt thất bại.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ khi ký duyệt: ' + err.message);
    } finally {
      setSigningLoading(false);
    }
  };

  const handleRunMidnightCheck = async () => {
    setAutoChecking(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('http://localhost:8000/api/users/ops/trip-reports/auto-midnight-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(data.message);
        fetchReports();
      } else {
        setError(data.message || 'Không thể thực hiện quét tự động.');
      }
    } catch (err) {
      setError('Lỗi khi thực hiện quét chốt đêm: ' + err.message);
    } finally {
      setAutoChecking(false);
    }
  };

  // KPIs
  const totalCount = reports.length;
  const pendingCount = reports.filter(r => r.approvalStatus === 'pending').length;
  const approvedCount = reports.filter(r => r.approvalStatus === 'approved').length;
  const autoMidnightCount = reports.filter(r => r.submissionType === 'auto_midnight').length;

  const formatDate = (dateStr) => {
    if (!dateStr) return '--:--';
    return new Date(dateStr).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit'
    });
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
      
      {/* KHỐI 1: TIÊU ĐỀ & MÔ TẢ TRANG */}
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        padding: '1.25rem 1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
              Báo Cáo Thống Kê Hành Khách Chuyến Xe
            </h1>
            <span style={{
              background: isAttendant ? '#eff6ff' : '#f0fdf4',
              color: isAttendant ? '#2563eb' : '#166534',
              border: `1px solid ${isAttendant ? '#bfdbfe' : '#bbf7d0'}`,
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '0.68rem',
              fontWeight: '700'
            }}>
              {isAttendant ? 'Nhân Viên Phụ Xe' : 'Quản Lý Vận Tải'}
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '4px', margin: 0 }}>
            Đối soát danh sách hành khách thực tế lên xe sau mỗi chuyến đi, chốt số liệu vận hành và phê duyệt bằng Chữ ký điện tử.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {!isAttendant && (
            <button
              onClick={handleRunMidnightCheck}
              disabled={autoChecking}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#334155',
                fontWeight: '700',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.78rem',
                cursor: autoChecking ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
              }}
              title="Quét các chuyến xe trong ngày chưa nộp để tự động khóa danh sách và tạo báo cáo lúc 00:00"
            >
              {autoChecking ? 'Đang quét tự động...' : 'Quét Chốt Đêm (00:00)'}
            </button>
          )}

          <button
            onClick={fetchReports}
            style={{
              backgroundColor: '#2563eb',
              border: 'none',
              color: '#ffffff',
              fontWeight: '700',
              padding: '0.5rem 1.2rem',
              borderRadius: '8px',
              fontSize: '0.78rem',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(37,99,235,0.25)'
            }}
          >
            Làm Mới
          </button>
        </div>
      </div>

      {/* THÔNG BÁO NẾU CÓ */}
      {error && (
        <div style={{
          background: '#fff1f2',
          border: '1px solid #fecdd3',
          color: '#be123c',
          padding: '0.75rem 1.25rem',
          borderRadius: '10px',
          fontSize: '0.8rem',
          fontWeight: '600'
        }}>
          Lưu ý: {error}
        </div>
      )}

      {success && (
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          color: '#15803d',
          padding: '0.75rem 1.25rem',
          borderRadius: '10px',
          fontSize: '0.8rem',
          fontWeight: '600'
        }}>
          Thành công: {success}
        </div>
      )}

      {/* KHỐI 2: 4 THẺ KPI CHỈ SỐ BÁO CÁO */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem'
      }}>
        {/* Card 1: Tổng báo cáo */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
              Tổng Báo Cáo
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: '900', color: '#0f172a', marginTop: '2px' }}>
              {totalCount}
            </div>
          </div>
          <div style={{
            background: '#f1f5f9',
            color: '#334155',
            padding: '4px 10px',
            borderRadius: '8px',
            fontSize: '0.75rem',
            fontWeight: '800'
          }}>
            Hồ sơ
          </div>
        </div>

        {/* Card 2: Chờ ký duyệt */}
        <div style={{
          background: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: '700', textTransform: 'uppercase' }}>
              Chờ Ký Duyệt
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: '900', color: '#b45309', marginTop: '2px' }}>
              {pendingCount}
            </div>
          </div>
          <div style={{
            background: '#fef3c7',
            color: '#b45309',
            padding: '4px 10px',
            borderRadius: '8px',
            fontSize: '0.75rem',
            fontWeight: '800'
          }}>
            Cần xử lý
          </div>
        </div>

        {/* Card 3: Đã ký duyệt điện tử */}
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: '700', textTransform: 'uppercase' }}>
              Đã Ký Duyệt Số
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: '900', color: '#15803d', marginTop: '2px' }}>
              {approvedCount}
            </div>
          </div>
          <div style={{
            background: '#dcfce7',
            color: '#15803d',
            padding: '4px 10px',
            borderRadius: '8px',
            fontSize: '0.75rem',
            fontWeight: '800'
          }}>
            Đã đóng dấu
          </div>
        </div>

        {/* Card 4: Tự động chốt đêm */}
        <div style={{
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#1e40af', fontWeight: '700', textTransform: 'uppercase' }}>
              Tự Động Chốt Đêm
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: '900', color: '#1e40af', marginTop: '2px' }}>
              {autoMidnightCount}
            </div>
          </div>
          <div style={{
            background: '#dbeafe',
            color: '#1e40af',
            padding: '4px 10px',
            borderRadius: '8px',
            fontSize: '0.75rem',
            fontWeight: '800'
          }}>
            00:00 Auto
          </div>
        </div>
      </div>

      {/* KHỐI 3: THANH CÔNG CỤ TÌM KIẾM & BỘ LỌC ĐA NĂNG */}
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        padding: '1rem 1.25rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.85rem',
        alignItems: 'center'
      }}>
        {/* Lọc ngày */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#475569' }}>Ngày:</span>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            style={{
              padding: '0.45rem 0.65rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.78rem',
              outline: 'none',
              backgroundColor: '#f8fafc'
            }}
          />
          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              style={{
                border: 'none',
                background: '#f1f5f9',
                color: '#64748b',
                padding: '0.45rem 0.65rem',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Tất cả ngày
            </button>
          )}
        </div>

        {/* Lọc trạng thái duyệt */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#475569' }}>Ký duyệt:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '0.45rem 0.65rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.78rem',
              outline: 'none',
              backgroundColor: '#f8fafc'
            }}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Chờ ký duyệt</option>
            <option value="approved">Đã ký duyệt</option>
            <option value="rejected">Bị từ chối</option>
          </select>
        </div>

        {/* Lọc hình thức gửi */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#475569' }}>Hình thức:</span>
          <select
            value={submissionFilter}
            onChange={(e) => setSubmissionFilter(e.target.value)}
            style={{
              padding: '0.45rem 0.65rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.78rem',
              outline: 'none',
              backgroundColor: '#f8fafc'
            }}
          >
            <option value="all">Tất cả hình thức</option>
            <option value="manual">Phụ xe nộp thủ công</option>
            <option value="auto_midnight">Hệ thống chốt lúc 00:00</option>
          </select>
        </div>

        {/* Ô tìm kiếm từ khóa */}
        <form onSubmit={handleSearchSubmit} style={{ flex: 1, minWidth: '220px', display: 'flex', gap: '6px' }}>
          <input
            type="text"
            placeholder="Tìm theo mã báo cáo, biển số xe, phụ xe, tuyến..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              padding: '0.45rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.78rem',
              outline: 'none',
              backgroundColor: '#ffffff'
            }}
          />
          <button
            type="submit"
            style={{
              padding: '0.45rem 0.85rem',
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Tìm
          </button>
        </form>
      </div>

      {/* KHỐI 4: BẢNG DỮ LIỆU BÁO CÁO CHUYẾN XE */}
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        padding: '1.25rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        overflowX: 'auto'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b', fontSize: '0.85rem' }}>
            Đang tải danh sách báo cáo chuyến xe...
          </div>
        ) : reports.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem 1rem',
            background: '#f8fafc',
            borderRadius: '10px',
            border: '1px dashed #cbd5e1'
          }}>
            <div style={{ fontWeight: '800', fontSize: '0.9rem', color: '#334155' }}>
              Không tìm thấy báo cáo chuyến xe nào
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
              Hãy thử chọn ngày khác hoặc nhấn "Làm mới" / "Quét Chốt Đêm".
            </div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '0.75rem 0.6rem', textAlign: 'center', width: '40px' }}>STT</th>
                <th style={{ padding: '0.75rem 0.8rem', fontWeight: '800' }}>Mã báo cáo</th>
                <th style={{ padding: '0.75rem 0.8rem', fontWeight: '800' }}>Tuyến đường &amp; Giờ chạy</th>
                <th style={{ padding: '0.75rem 0.8rem', fontWeight: '800' }}>Phương tiện</th>
                <th style={{ padding: '0.75rem 0.8rem', fontWeight: '800' }}>Nhân sự (Phụ xe / Tài xế)</th>
                <th style={{ padding: '0.75rem 0.8rem', fontWeight: '800', textAlign: 'center' }}>Khách lên xe / Đặt vé</th>
                <th style={{ padding: '0.75rem 0.8rem', fontWeight: '800' }}>Hình thức nộp</th>
                <th style={{ padding: '0.75rem 0.8rem', fontWeight: '800', textAlign: 'center' }}>Trạng thái</th>
                <th style={{ padding: '0.75rem 0.8rem', fontWeight: '800', textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r, idx) => (
                <tr key={r._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.85rem 0.6rem', textAlign: 'center', color: '#64748b' }}>
                    {idx + 1}
                  </td>

                  {/* Mã báo cáo */}
                  <td style={{ padding: '0.85rem 0.8rem' }}>
                    <div style={{ fontWeight: '800', color: '#0f172a' }}>{r.reportCode}</div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
                      Nộp: {formatDate(r.submittedAt)}
                    </div>
                  </td>

                  {/* Tuyến đường & Giờ chạy */}
                  <td style={{ padding: '0.85rem 0.8rem' }}>
                    <div style={{ fontWeight: '800', color: '#1d4ed8' }}>
                      {r.routeInfo?.routeName || `${r.routeInfo?.startPoint} ➔ ${r.routeInfo?.endPoint}`}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: '2px' }}>
                      Khởi hành: {formatDate(r.routeInfo?.departureTime)}
                    </div>
                  </td>

                  {/* Phương tiện */}
                  <td style={{ padding: '0.85rem 0.8rem' }}>
                    <div style={{ fontWeight: '800', color: '#0f172a' }}>{r.routeInfo?.plateNumber}</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{r.routeInfo?.busType || '16 chỗ'}</div>
                  </td>

                  {/* Nhân sự */}
                  <td style={{ padding: '0.85rem 0.8rem' }}>
                    <div>
                      Phụ xe: <strong>{r.routeInfo?.assistantName || 'Chưa cập nhật'}</strong>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '1px' }}>
                      Tài xế: {r.routeInfo?.driverName || 'Chưa cập nhật'}
                    </div>
                  </td>

                  {/* Thống kê khách */}
                  <td style={{ padding: '0.85rem 0.8rem', textAlign: 'center' }}>
                    <span style={{
                      backgroundColor: '#ecfdf5',
                      color: '#15803d',
                      border: '1px solid #bbf7d0',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontWeight: '800',
                      fontSize: '0.78rem'
                    }}>
                      {r.stats?.totalBoarded || 0} / {r.stats?.totalBooked || 0}
                    </span>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '3px' }}>
                      Lấp đầy: <strong>{r.stats?.occupancyRate || 0}%</strong> ({r.stats?.totalSeats || 16} ghế)
                    </div>
                  </td>

                  {/* Hình thức nộp */}
                  <td style={{ padding: '0.85rem 0.8rem' }}>
                    {r.submissionType === 'auto_midnight' ? (
                      <span style={{
                        backgroundColor: '#eff6ff',
                        color: '#1e40af',
                        border: '1px solid #bfdbfe',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontWeight: '700',
                        fontSize: '0.68rem'
                      }}>
                        Tự động chốt 00:00
                      </span>
                    ) : (
                      <span style={{
                        backgroundColor: '#f8fafc',
                        color: '#334155',
                        border: '1px solid #cbd5e1',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontWeight: '700',
                        fontSize: '0.68rem'
                      }}>
                        Phụ xe nộp
                      </span>
                    )}
                  </td>

                  {/* Trạng thái duyệt */}
                  <td style={{ padding: '0.85rem 0.8rem', textAlign: 'center' }}>
                    {r.approvalStatus === 'approved' ? (
                      <div>
                        <span style={{
                          backgroundColor: '#dcfce7',
                          color: '#15803d',
                          border: '1px solid #bbf7d0',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontWeight: '800',
                          fontSize: '0.7rem'
                        }}>
                          ĐÃ KÝ DUYỆT
                        </span>
                        {r.digitalSignature?.certificateCode && (
                          <div style={{ fontSize: '0.65rem', color: '#166534', marginTop: '2px', fontWeight: '600' }}>
                            {r.digitalSignature.certificateCode}
                          </div>
                        )}
                      </div>
                    ) : r.approvalStatus === 'rejected' ? (
                      <span style={{
                        backgroundColor: '#fff1f2',
                        color: '#be123c',
                        border: '1px solid #fecdd3',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontWeight: '800',
                        fontSize: '0.7rem'
                      }}>
                        TỪ CHỐI
                      </span>
                    ) : (
                      <span style={{
                        backgroundColor: '#fffbeb',
                        color: '#b45309',
                        border: '1px solid #fde68a',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontWeight: '800',
                        fontSize: '0.7rem'
                      }}>
                        CHỜ KÝ DUYỆT
                      </span>
                    )}
                  </td>

                  {/* Thao tác */}
                  <td style={{ padding: '0.85rem 0.8rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleOpenReportModal(r)}
                        style={{
                          backgroundColor: '#f1f5f9',
                          color: '#1e293b',
                          border: '1px solid #cbd5e1',
                          padding: '5px 10px',
                          borderRadius: '6px',
                          fontWeight: '700',
                          fontSize: '0.72rem',
                          cursor: 'pointer'
                        }}
                      >
                        Xem / In
                      </button>

                      {!isAttendant && r.approvalStatus !== 'approved' && (
                        <button
                          onClick={() => handleOpenReportModal(r)}
                          style={{
                            backgroundColor: '#16a34a',
                            color: '#ffffff',
                            border: 'none',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            fontWeight: '700',
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)'
                          }}
                        >
                          Ký Duyệt
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL IN ERP VÀ KÝ DUYỆT ĐIỆN TỬ */}
      <TripReportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        report={selectedReport}
        canSign={!isAttendant && selectedReport?.approvalStatus !== 'approved'}
        onSign={handleSignReport}
        signingLoading={signingLoading}
      />

    </div>
  );
};

export default OpsTripReportsPage;

