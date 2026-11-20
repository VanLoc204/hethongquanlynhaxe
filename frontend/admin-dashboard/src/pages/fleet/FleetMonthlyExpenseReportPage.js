import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import MonthlyFleetExpenseReportModal from '../../components/MonthlyFleetExpenseReportModal';

const API_BASE = 'http://localhost:8000/api';

const formatCurrency = (val) => {
  return (val || 0).toLocaleString('vi-VN') + ' đ';
};

const formatDate = (dateStr) => {
  if (!dateStr) return '--/--/----';
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const FleetMonthlyExpenseReportPage = () => {
  const { token, user } = useContext(AuthContext);

  // Mặc định chọn tháng hiện tại (Tháng 11/2026 trong hệ thống mẫu hoặc Date hiện tại)
  const [selectedMonth, setSelectedMonth] = useState(11);
  const [selectedYear, setSelectedYear] = useState(2026);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fleetManagerNotes, setFleetManagerNotes] = useState('');

  // Dữ liệu preview tháng
  const [previewData, setPreviewData] = useState({
    summary: {
      totalExpenses: 0,
      totalMaintenanceCost: 0,
      maintenanceCount: 0,
      totalDistanceKm: 0,
      totalFuelLiters: 0,
      totalFuelCost: 0,
      availabilityRate: 100
    },
    busDetails: [],
    maintenanceRecords: [],
    existingReport: null
  });

  // Danh sách lịch sử báo cáo các tháng
  const [historyReports, setHistoryReports] = useState([]);

  // Modal xem và in báo cáo
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedReportForModal, setSelectedReportForModal] = useState(null);

  // 1. Tải preview chi tiêu theo tháng/năm
  const fetchPreviewData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `${API_BASE}/trips/fleet-expense-reports/preview?month=${selectedMonth}&year=${selectedYear}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setPreviewData({
          summary: data.data.summary || {},
          busDetails: data.data.busDetails || [],
          maintenanceRecords: data.data.maintenanceRecords || [],
          existingReport: data.data.existingReport || null
        });
        if (data.data.existingReport) {
          setFleetManagerNotes(data.data.existingReport.fleetManagerNotes || '');
        } else {
          setFleetManagerNotes('');
        }
      } else {
        setError(data.message || 'Không thể tải dữ liệu chi phí tháng.');
      }
    } catch (err) {
      console.error('fetchPreviewData error:', err);
      setError('Lỗi kết nối máy chủ khi lấy dữ liệu chi phí đội xe.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Lấy danh sách lịch sử các báo cáo đã nộp
  const fetchHistoryReports = async () => {
    try {
      const res = await fetch(`${API_BASE}/trips/fleet-expense-reports?year=${selectedYear}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setHistoryReports(data.reports || []);
      }
    } catch (err) {
      console.error('fetchHistoryReports error:', err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchPreviewData();
      fetchHistoryReports();
    }
  }, [token, selectedMonth, selectedYear]);

  // 3. Quản lý Đội xe nộp báo cáo tháng
  const handleSubmitReport = async () => {
    if (!window.confirm(`Bạn có chắc chắn muốn nộp Báo cáo Chi tiêu Đội xe Tháng ${selectedMonth}/${selectedYear} lên Ban Giám đốc?`)) {
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API_BASE}/trips/fleet-expense-reports/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          month: selectedMonth,
          year: selectedYear,
          fleetManagerNotes: fleetManagerNotes.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(data.message || 'Nộp báo cáo chi tiêu thành công!');
        fetchPreviewData();
        fetchHistoryReports();
      } else {
        setError(data.message || 'Không thể nộp báo cáo.');
      }
    } catch (err) {
      console.error('handleSubmitReport error:', err);
      setError('Lỗi máy chủ khi nộp báo cáo chi tiêu.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenModal = (reportObj) => {
    setSelectedReportForModal(reportObj);
    setModalOpen(true);
  };

  const currentReport = previewData.existingReport;

  return (
    <div style={{ padding: '24px 28px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'inherit' }}>
      {/* Toast thông báo */}
      {success && (
        <div style={{ backgroundColor: '#10b981', color: '#ffffff', padding: '12px 20px', borderRadius: '8px', marginBottom: '16px', fontWeight: '700', fontSize: '0.85rem' }}>
          ✓ {success}
        </div>
      )}
      {error && (
        <div style={{ backgroundColor: '#ef4444', color: '#ffffff', padding: '12px 20px', borderRadius: '8px', marginBottom: '16px', fontWeight: '700', fontSize: '0.85rem' }}>
          ✕ {error}
        </div>
      )}

      {/* Header Trang & Bộ lọc Kỳ Báo Cáo */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '20px 24px',
        marginBottom: '20px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Báo Cáo Chi Tiêu &amp; Chi Phí Đội Xe Hàng Tháng
            </h1>
            <span style={{ backgroundColor: '#fefce8', color: '#a16207', border: '1px solid #fef08a', fontSize: '0.72rem', fontWeight: '800', padding: '2px 10px', borderRadius: '20px' }}>
              QUẢN LÝ ĐỘI XE
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
            Tổng hợp toàn bộ chi phí sửa chữa gara, tiền dầu Diesel tiêu thụ &amp; tỷ lệ sẵn sàng của phương tiện trình Ban Giám Đốc duyệt
          </p>
        </div>

        {/* Bộ chọn Tháng / Năm */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: '700', color: '#475569' }}>
            <span>Kỳ báo cáo:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: '700', color: '#0f172a', backgroundColor: '#ffffff' }}
            >
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  Tháng {i + 1}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: '700', color: '#0f172a', backgroundColor: '#ffffff' }}
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>

          {currentReport && (
            <button
              onClick={() => handleOpenModal(currentReport)}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #2563eb',
                color: '#2563eb',
                padding: '7px 14px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Xem Bản In Báo Cáo
            </button>
          )}
        </div>
      </div>

      {/* Trạng thái Báo Cáo Tháng Này */}
      <div style={{
        backgroundColor: currentReport?.status === 'approved' ? '#f0fdf4' : (currentReport?.status === 'pending' ? '#fffbeb' : '#ffffff'),
        borderRadius: '10px',
        padding: '16px 20px',
        marginBottom: '20px',
        border: `1px solid ${currentReport?.status === 'approved' ? '#bbf7d0' : (currentReport?.status === 'pending' ? '#fde68a' : '#e2e8f0')}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
            Tình Trạng Báo Cáo Tháng {selectedMonth}/{selectedYear}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            {currentReport?.status === 'approved' ? (
              <span style={{ backgroundColor: '#dcfce7', color: '#15803d', fontWeight: '800', fontSize: '0.85rem', padding: '4px 12px', borderRadius: '20px' }}>
                ✓ ĐÃ ĐƯỢC BAN GIÁM ĐỐC PHÊ DUYỆT ({currentReport.reportCode})
              </span>
            ) : currentReport?.status === 'pending' ? (
              <span style={{ backgroundColor: '#fef3c7', color: '#b45309', fontWeight: '800', fontSize: '0.85rem', padding: '4px 12px', borderRadius: '20px' }}>
                ⏳ ĐANG CHỜ BAN GIÁM ĐỐC PHÊ DUYỆT ({currentReport.reportCode})
              </span>
            ) : currentReport?.status === 'rejected' ? (
              <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', fontWeight: '800', fontSize: '0.85rem', padding: '4px 12px', borderRadius: '20px' }}>
                ✕ BỊ TỪ CHỐI / YÊU CẦU GIẢI TRÌNH: "{currentReport.directorNotes}"
              </span>
            ) : (
              <span style={{ backgroundColor: '#f1f5f9', color: '#475569', fontWeight: '800', fontSize: '0.85rem', padding: '4px 12px', borderRadius: '20px' }}>
                CHƯA NỘP BÁO CÁO THÁNG NÀY
              </span>
            )}
          </div>
        </div>

        {/* Nút Hành Động Nộp / Nộp Lại */}
        <div>
          {(!currentReport || currentReport.status === 'rejected') && (
            <button
              onClick={handleSubmitReport}
              disabled={submitting || loading}
              style={{
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                padding: '9px 20px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: '800',
                cursor: submitting ? 'wait' : 'pointer',
                boxShadow: '0 2px 6px rgba(37,99,235,0.3)'
              }}
            >
              {submitting ? 'Đang gửi...' : (currentReport?.status === 'rejected' ? 'Nộp Lại Báo Cáo Đã Chỉnh Sửa' : `Gửi Báo Cáo Tháng ${selectedMonth}/${selectedYear} Trình Giám Đốc`)}
            </button>
          )}
        </div>
      </div>

      {/* 4 Thẻ KPI Tóm Tắt Chi Phí */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        {/* Thẻ 1: Tổng chi phí */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '18px 20px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
            Tổng Chi Phí Đội Xe Tháng
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: '900', color: '#16a34a' }}>
            {formatCurrency(previewData.summary.totalExpenses)}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
            Bao gồm tiền bảo trì gara &amp; tiền dầu DO
          </div>
        </div>

        {/* Thẻ 2: Tiền bảo trì gara */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '18px 20px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
            Chi Phí Bảo Trì &amp; Sửa Chữa
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: '900', color: '#dc2626' }}>
            {formatCurrency(previewData.summary.totalMaintenanceCost)}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#b91c1c', marginTop: '4px', fontWeight: '600' }}>
            {previewData.summary.maintenanceCount || 0} lượt đưa xe vào gara
          </div>
        </div>

        {/* Thẻ 3: Tiền dầu Diesel */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '18px 20px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
            Chi Phí Nhiên Liệu (Dầu DO)
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: '900', color: '#d97706' }}>
            {formatCurrency(previewData.summary.totalFuelCost)}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
            {previewData.summary.totalFuelLiters?.toLocaleString('vi-VN')} Lít ({previewData.summary.totalDistanceKm?.toLocaleString('vi-VN')} km)
          </div>
        </div>

        {/* Thẻ 4: Tỷ lệ sẵn sàng */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '18px 20px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
            Tỷ Lệ Phương Tiện Sẵn Sàng
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: '900', color: '#2563eb' }}>
            {previewData.summary.availabilityRate || 100}%
          </div>
          <div style={{ fontSize: '0.72rem', color: '#059669', marginTop: '4px', fontWeight: '600' }}>
            {previewData.summary.readyBusesCount || 0} xe sẵn sàng • {previewData.summary.maintenanceBusesCount || 0} xe đang xưởng
          </div>
        </div>
      </div>

      {/* Bảng Chi Tiết Từng Phương Tiện */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: '0 0 14px 0' }}>
          Chi Tiết Chi Phí &amp; Quãng Đường Lăn Bánh Từng Xe ({previewData.busDetails.length} xe)
        </h2>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                <th style={{ padding: '10px 14px', fontWeight: '700' }}>#</th>
                <th style={{ padding: '10px 14px', fontWeight: '700' }}>BIỂN SỐ XE</th>
                <th style={{ padding: '10px 14px', fontWeight: '700' }}>LOẠI XE</th>
                <th style={{ padding: '10px 14px', fontWeight: '700', textAlign: 'center' }}>SỐ CHUYẾN</th>
                <th style={{ padding: '10px 14px', fontWeight: '700', textAlign: 'right' }}>QUÃNG ĐƯỜNG (KM)</th>
                <th style={{ padding: '10px 14px', fontWeight: '700', textAlign: 'right' }}>DẦU TIÊU THỤ (L)</th>
                <th style={{ padding: '10px 14px', fontWeight: '700', textAlign: 'right' }}>TIỀN DẦU DIESEL</th>
                <th style={{ padding: '10px 14px', fontWeight: '700', textAlign: 'right' }}>TIỀN SỬA CHỮA</th>
                <th style={{ padding: '10px 14px', fontWeight: '700', textAlign: 'right' }}>TỔNG CHI PHÍ</th>
                <th style={{ padding: '10px 14px', fontWeight: '700', textAlign: 'center' }}>TRẠNG THÁI</th>
              </tr>
            </thead>
            <tbody>
              {previewData.busDetails.map((bus, idx) => (
                <tr key={bus.busId || idx} style={{ borderBottom: '1px solid #f1f5f9', color: '#1e293b' }}>
                  <td style={{ padding: '10px 14px', color: '#94a3b8' }}>{idx + 1}</td>
                  <td style={{ padding: '10px 14px', fontWeight: '800', color: '#0f172a' }}>{bus.plateNumber}</td>
                  <td style={{ padding: '10px 14px', color: '#64748b' }}>{bus.busType}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '700' }}>{bus.tripsCount || 0}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '600' }}>
                    {bus.distanceKm?.toLocaleString('vi-VN')} km
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', color: '#d97706', fontWeight: '600' }}>
                    {bus.fuelLiters?.toLocaleString('vi-VN')} L
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', color: '#d97706', fontWeight: '700' }}>
                    {formatCurrency(bus.fuelCost)}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', color: '#dc2626', fontWeight: '700' }}>
                    {formatCurrency(bus.maintenanceCost)}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '800', color: '#0f172a' }}>
                    {formatCurrency((bus.fuelCost || 0) + (bus.maintenanceCost || 0))}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    {bus.activeStatus === 'ready' ? (
                      <span style={{ backgroundColor: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '700' }}>
                        Sẵn sàng
                      </span>
                    ) : (
                      <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '700' }}>
                        Bảo trì
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Ô Nhập Ghi Chú & Giải Trình */}
        {(!currentReport || currentReport.status !== 'approved') && (
          <div style={{ marginTop: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
              Ghi chú &amp; Giải trình biến động chi phí của Quản lý Đội xe (gửi kèm báo cáo):
            </label>
            <textarea
              rows={3}
              placeholder="VD: Tháng này có 2 xe đại tu định kỳ 50.000km tại Gara Thiên Phúc; lượng dầu tiêu thụ tăng 8% do tăng tần suất chạy tuyến cao điểm cuối tuần..."
              value={fleetManagerNotes}
              onChange={(e) => setFleetManagerNotes(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.8rem',
                resize: 'vertical'
              }}
            />
          </div>
        )}
      </div>

      {/* Lịch Sử Các Báo Cáo Tháng Đã Nộp */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' }}>
        <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: '0 0 14px 0' }}>
          Lịch Sử Báo Cáo Chi Tiêu Các Tháng ({historyReports.length} báo cáo)
        </h2>

        {historyReports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '0.85rem' }}>
            Chưa có báo cáo chi tiêu nào được lưu trữ cho năm {selectedYear}.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                  <th style={{ padding: '10px 14px', fontWeight: '700' }}>MÃ BÁO CÁO</th>
                  <th style={{ padding: '10px 14px', fontWeight: '700' }}>KỲ BÁO CÁO</th>
                  <th style={{ padding: '10px 14px', fontWeight: '700', textAlign: 'right' }}>TỔNG CHI PHÍ</th>
                  <th style={{ padding: '10px 14px', fontWeight: '700', textAlign: 'right' }}>TIỀN DẦU</th>
                  <th style={{ padding: '10px 14px', fontWeight: '700', textAlign: 'right' }}>TIỀN BẢO TRÌ</th>
                  <th style={{ padding: '10px 14px', fontWeight: '700', textAlign: 'center' }}>NGÀY NỘP</th>
                  <th style={{ padding: '10px 14px', fontWeight: '700', textAlign: 'center' }}>TRẠNG THÁI</th>
                  <th style={{ padding: '10px 14px', fontWeight: '700', textAlign: 'center' }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {historyReports.map((item) => (
                  <tr key={item._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px', fontWeight: '700', color: '#2563eb' }}>{item.reportCode}</td>
                    <td style={{ padding: '10px 14px', fontWeight: '700' }}>Tháng {item.month}/{item.year}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '800', color: '#16a34a' }}>
                      {formatCurrency(item.summary?.totalExpenses)}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: '#d97706' }}>
                      {formatCurrency(item.summary?.totalFuelCost)}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: '#dc2626' }}>
                      {formatCurrency(item.summary?.totalMaintenanceCost)}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', color: '#64748b' }}>
                      {formatDate(item.submittedAt)}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      {item.status === 'approved' ? (
                        <span style={{ backgroundColor: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '800' }}>
                          Đã duyệt
                        </span>
                      ) : item.status === 'pending' ? (
                        <span style={{ backgroundColor: '#fffbeb', color: '#d97706', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '800' }}>
                          Chờ duyệt
                        </span>
                      ) : (
                        <span style={{ backgroundColor: '#fef2f2', color: '#dc2626', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '800' }}>
                          Yêu cầu sửa
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleOpenModal(item)}
                        style={{
                          backgroundColor: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          color: '#334155',
                          cursor: 'pointer'
                        }}
                      >
                        Xem Chi Tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Crystal Report */}
      <MonthlyFleetExpenseReportModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        report={selectedReportForModal}
      />
    </div>
  );
};

export default FleetMonthlyExpenseReportPage;

