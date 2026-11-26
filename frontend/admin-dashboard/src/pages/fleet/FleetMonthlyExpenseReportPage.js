import React, { useState, useEffect, useContext, useMemo } from 'react';
import API_BASE_URL from '../../config/api';
import { AuthContext } from '../../context/AuthContext';
import MonthlyFleetExpenseReportModal from '../../components/MonthlyFleetExpenseReportModal';

const API_BASE = API_BASE_URL;

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

  // Bộ lọc danh sách xe trong báo cáo
  const [busSearchText, setBusSearchText] = useState('');
  const [busStatusFilter, setBusStatusFilter] = useState('all');

  // Bộ lọc bảng phiếu bảo trì trong tháng
  const [maintTypeFilter, setMaintTypeFilter] = useState('all');
  const [maintSearchText, setMaintSearchText] = useState('');

  // Dữ liệu preview tháng
  const [previewData, setPreviewData] = useState({
    summary: {
      totalExpenses: 0,
      totalMaintenanceCost: 0,
      scheduledMaintCost: 0,
      repairCost: 0,
      maintenanceCount: 0,
      scheduledMaintCount: 0,
      repairCount: 0,
      totalTrips: 0,
      totalDistanceKm: 0,
      totalWorkshopDays: 0,
      readyBusesCount: 0,
      maintenanceBusesCount: 0,
      availabilityRate: 100
    },
    busDetails: [],
    maintenanceRecords: [],
    existingReport: null,
    isMonthEnded: false
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
          existingReport: data.data.existingReport || null,
          isMonthEnded: data.data.isMonthEnded ?? (new Date() >= new Date(selectedYear, selectedMonth, 1))
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

  // Kiểm tra điều kiện nộp: Tháng phải kết thúc (đã bước sang tháng tiếp theo)
  const isMonthEnded = useMemo(() => {
    const now = new Date();
    const nextMonthDate = new Date(selectedYear, selectedMonth, 1, 0, 0, 0);
    return now >= nextMonthDate;
  }, [selectedMonth, selectedYear]);

  // Danh sách xe sau khi lọc
  const filteredBuses = useMemo(() => {
    return (previewData.busDetails || []).filter(b => {
      const matchText = !busSearchText ||
        b.plateNumber?.toLowerCase().includes(busSearchText.toLowerCase()) ||
        b.busType?.toLowerCase().includes(busSearchText.toLowerCase()) ||
        b.maintDetails?.toLowerCase().includes(busSearchText.toLowerCase());

      const matchStatus = busStatusFilter === 'all' || b.activeStatus === busStatusFilter;
      return matchText && matchStatus;
    });
  }, [previewData.busDetails, busSearchText, busStatusFilter]);

  // Danh sách phiếu bảo trì sau khi lọc
  const filteredMaints = useMemo(() => {
    return (previewData.maintenanceRecords || []).filter(m => {
      const matchText = !maintSearchText ||
        m.plateNumber?.toLowerCase().includes(maintSearchText.toLowerCase()) ||
        m.garage?.toLowerCase().includes(maintSearchText.toLowerCase()) ||
        m.description?.toLowerCase().includes(maintSearchText.toLowerCase());

      const matchType = maintTypeFilter === 'all' || m.type === maintTypeFilter;
      return matchText && matchType;
    });
  }, [previewData.maintenanceRecords, maintSearchText, maintTypeFilter]);

  // 3. Quản lý Xe nộp báo cáo tháng
  const handleSubmitReport = async () => {
    if (!isMonthEnded) {
      alert(`Báo cáo chi tiêu Đội xe Tháng ${selectedMonth}/${selectedYear} chỉ được phép chốt và gửi lên Ban Giám đốc sau khi kết thúc tháng.`);
      return;
    }

    if (!window.confirm(`Bạn có chắc chắn muốn nộp Báo cáo Chi tiêu & Biến động Kỹ thuật Đội xe Tháng ${selectedMonth}/${selectedYear} lên Ban Giám đốc?`)) {
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
          {success}
        </div>
      )}
      {error && (
        <div style={{ backgroundColor: '#ef4444', color: '#ffffff', padding: '12px 20px', borderRadius: '8px', marginBottom: '16px', fontWeight: '700', fontSize: '0.85rem' }}>
          {error}
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
              Báo Cáo Chi Tiêu &amp; Biến Động Kỹ Thuật Đội Xe
            </h1>
            <span style={{ backgroundColor: '#fefce8', color: '#a16207', border: '1px solid #fef08a', fontSize: '0.72rem', fontWeight: '800', padding: '2px 10px', borderRadius: '20px' }}>
              QUẢN LÝ XE
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
            Tổng hợp toàn bộ chi phí sửa chữa gara, lịch trình xuất xưởng, cự ly vận hành &amp; tỷ lệ sẵn sàng phương tiện trình Ban Giám Đốc
          </p>
        </div>

        {/* Bộ chọn Tháng / Năm */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
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
              <option value={2024}>2024</option>
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

      {/* Cảnh Báo Quy Định Chốt Tháng: Chỉ được nộp khi hết tháng */}
      {!isMonthEnded && (
        <div style={{
          backgroundColor: '#fffaf5',
          border: '1px solid #fed7aa',
          borderRadius: '10px',
          padding: '10px 16px',
          marginBottom: '20px',
          fontSize: '0.8rem',
          color: '#9a3412',
          lineHeight: '1.4'
        }}>
          <strong>Lưu ý:</strong> Kỳ báo cáo <strong>Tháng {selectedMonth}/{selectedYear}</strong> đang trong chu kỳ vận hành. Báo cáo chỉ được nộp lên Ban Giám đốc sau khi kết thúc tháng (từ ngày 01/{selectedMonth < 12 ? (selectedMonth + 1 < 10 ? '0' + (selectedMonth + 1) : selectedMonth + 1) : '01'}/{selectedMonth === 12 ? selectedYear + 1 : selectedYear}).
        </div>
      )}

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
                ĐÃ ĐƯỢC BAN GIÁM ĐỐC PHÊ DUYỆT • {currentReport.reportCode}
              </span>
            ) : currentReport?.status === 'pending' ? (
              <span style={{ backgroundColor: '#fef3c7', color: '#b45309', fontWeight: '800', fontSize: '0.85rem', padding: '4px 12px', borderRadius: '20px' }}>
                ĐANG CHỜ BAN GIÁM ĐỐC PHÊ DUYỆT • {currentReport.reportCode}
              </span>
            ) : currentReport?.status === 'rejected' ? (
              <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', fontWeight: '800', fontSize: '0.85rem', padding: '4px 12px', borderRadius: '20px' }}>
                BỊ TỪ CHỐI / YÊU CẦU GIẢI TRÌNH: "{currentReport.directorNotes}"
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
          {isMonthEnded ? (
            (!currentReport || currentReport.status === 'rejected' || currentReport.status === 'pending') && (
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
                {submitting ? 'Đang gửi...' : (currentReport?.status === 'rejected' ? 'Nộp Lại Báo Cáo Đã Chỉnh Sửa' : (currentReport?.status === 'pending' ? 'Cập Nhật Lại Báo Cáo' : `Gửi Báo Cáo Tháng ${selectedMonth}/${selectedYear} Trình Giám Đốc`))}
              </button>
            )
          ) : (
            <button
              disabled={true}
              title="Chỉ được phép gửi báo cáo sau khi tháng kết thúc."
              style={{
                backgroundColor: '#94a3b8',
                color: '#ffffff',
                border: 'none',
                padding: '9px 18px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: '700',
                cursor: 'not-allowed',
                boxShadow: 'none'
              }}
            >
              Chưa hết tháng
            </button>
          )}
        </div>
      </div>

      {/* 4 Thẻ KPI Tóm Tắt Chi Phí & Kỹ Thuật (Loại bỏ nhiên liệu) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        {/* Thẻ 1: Tổng chi phí bảo trì & sửa chữa tháng */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '18px 20px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
            Tổng Chi Phí Bảo Trì &amp; Sửa Chữa Tháng
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: '900', color: '#dc2626' }}>
            {formatCurrency(previewData.summary.totalMaintenanceCost)}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
            Bao gồm {formatCurrency(previewData.summary.scheduledMaintCost || 0)} bảo dưỡng &amp; {formatCurrency(previewData.summary.repairCost || 0)} sửa chữa
          </div>
        </div>

        {/* Thẻ 2: Lượt xe vào gara */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '18px 20px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
            Tổng Lượt Xe Vào Xưởng
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: '900', color: '#c2410c' }}>
            {previewData.summary.maintenanceCount || 0} lượt
          </div>
          <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '4px', fontWeight: '600' }}>
            {previewData.summary.scheduledMaintCount || 0} lượt bảo dưỡng • {previewData.summary.repairCount || 0} lượt sửa chữa
          </div>
        </div>

        {/* Thẻ 3: Quãng đường & chuyến xe thực tế */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '18px 20px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
            Vận Hành Toàn Đội Xe
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: '900', color: '#0f172a' }}>
            {(previewData.summary.totalDistanceKm || 0).toLocaleString('vi-VN')} km
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
            Tổng cộng {previewData.summary.totalTrips || 0} chuyến xe thực hiện trong tháng
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
            {previewData.summary.readyBusesCount || 0} xe sẵn sàng • {previewData.summary.maintenanceBusesCount || 0} xe đang xưởng • {previewData.summary.totalWorkshopDays || 0} ngày xưởng
          </div>
        </div>
      </div>

      {/* Bảng Chi Tiết Từng Phương Tiện Trong Tháng */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ fontSize: '0.98rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Chi Tiết Vận Hành &amp; Chi Phí Kỹ Thuật Từng Xe
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
              Bóc tách chi phí bảo dưỡng định kỳ, sửa chữa sự cố và các hạng mục kỹ thuật thực hiện trong tháng
            </p>
          </div>

          {/* Bộ lọc tìm kiếm xe */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="text"
              placeholder="Tìm theo biển số, dòng xe..."
              value={busSearchText}
              onChange={(e) => setBusSearchText(e.target.value)}
              style={{
                padding: '6px 12px',
                fontSize: '0.78rem',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                outline: 'none',
                width: '190px'
              }}
            />
            <select
              value={busStatusFilter}
              onChange={(e) => setBusStatusFilter(e.target.value)}
              style={{
                padding: '6px 10px',
                fontSize: '0.78rem',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                outline: 'none',
                backgroundColor: '#ffffff'
              }}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="ready">Sẵn sàng</option>
              <option value="maintenance">Đang bảo dưỡng</option>
              <option value="repairing">Đang sửa chữa</option>
              <option value="inactive">Tạm ngưng</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '1150px', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                <th style={{ padding: '10px 14px', fontWeight: '700', whiteSpace: 'nowrap' }}>#</th>
                <th style={{ padding: '10px 14px', fontWeight: '700', whiteSpace: 'nowrap' }}>BIỂN SỐ XE</th>
                <th style={{ padding: '10px 14px', fontWeight: '700', whiteSpace: 'nowrap' }}>LOẠI XE</th>
                <th style={{ padding: '10px 14px', fontWeight: '700', textAlign: 'center', whiteSpace: 'nowrap' }}>SỐ CHUYẾN</th>
                <th style={{ padding: '10px 14px', fontWeight: '700', textAlign: 'right', whiteSpace: 'nowrap' }}>QUÃNG ĐƯỜNG (KM)</th>
                <th style={{ padding: '10px 14px', fontWeight: '700', textAlign: 'center', whiteSpace: 'nowrap' }}>LƯỢT VÀO XƯỞNG</th>
                <th style={{ padding: '10px 14px', fontWeight: '700', textAlign: 'right', whiteSpace: 'nowrap' }}>TIỀN SỬA CHỮA / BẢO TRÌ</th>
                <th style={{ padding: '10px 14px', fontWeight: '700', whiteSpace: 'nowrap', minWidth: '380px' }}>HẠNG MỤC KỸ THUẬT ĐÃ THỰC HIỆN</th>
                <th style={{ padding: '10px 14px', fontWeight: '700', textAlign: 'center', whiteSpace: 'nowrap' }}>TRẠNG THÁI</th>
              </tr>
            </thead>
            <tbody>
              {filteredBuses.map((bus, idx) => (
                <tr key={bus.busId || idx} style={{ borderBottom: '1px solid #f1f5f9', color: '#1e293b' }}>
                  <td style={{ padding: '10px 14px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{idx + 1}</td>
                  <td style={{ padding: '10px 14px', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap' }}>
                    <div style={{
                      display: 'inline-block',
                      border: '1.5px solid #0f172a',
                      borderRadius: '4px',
                      padding: '1px 6px',
                      fontWeight: '800',
                      letterSpacing: '0.5px'
                    }}>
                      {bus.plateNumber}
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#475569', fontWeight: '600', whiteSpace: 'nowrap' }}>{bus.busType}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '700', whiteSpace: 'nowrap' }}>{bus.tripsCount || 0}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '600', whiteSpace: 'nowrap' }}>
                    {(bus.distanceKm || 0).toLocaleString('vi-VN')} km
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {bus.maintCount > 0 ? (
                      <span style={{ backgroundColor: '#fff7ed', color: '#c2410c', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '800' }}>
                        {bus.maintCount} lượt
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>0 lượt</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', color: bus.maintenanceCost > 0 ? '#dc2626' : '#64748b', fontWeight: '800', whiteSpace: 'nowrap' }}>
                    {formatCurrency(bus.maintenanceCost)}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#334155', minWidth: '380px', fontSize: '0.78rem', lineHeight: '1.5' }}>
                    {bus.maintDetails ? (
                      <div style={{ whiteSpace: 'normal', wordBreak: 'normal', lineHeight: '1.5' }}>{bus.maintDetails}</div>
                    ) : (
                      <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Không phát sinh sửa chữa</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {bus.activeStatus === 'maintenance' ? (
                      <span style={{ backgroundColor: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '800' }}>
                        Đang bảo dưỡng
                      </span>
                    ) : bus.activeStatus === 'repairing' ? (
                      <span style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '800' }}>
                        Đang sửa chữa
                      </span>
                    ) : bus.activeStatus === 'inactive' ? (
                      <span style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '800' }}>
                        Tạm ngưng
                      </span>
                    ) : (
                      <span style={{ backgroundColor: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '800' }}>
                        Sẵn sàng
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
              Ghi chú &amp; Giải trình biến động kỹ thuật của Quản lý Xe (gửi kèm báo cáo):
            </label>
            <textarea
              rows={3}
              placeholder="VD: Tháng này có 2 xe đại tu định kỳ và thay lốc điều hòa tại Gara Thiên Phúc; toàn bộ xe hoàn tất nghiệm thu và đạt chuẩn an toàn xuất bến..."
              value={fleetManagerNotes}
              onChange={(e) => setFleetManagerNotes(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.8rem',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
          </div>
        )}
      </div>

      {/* Bảng Kê Chi Tiết Các Phiếu Nghiệm Thu Hoàn Tất Trong Tháng */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ fontSize: '0.98rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Danh Sách Phiếu Nghiệm Thu Bảo Trì &amp; Sửa Chữa Trong Tháng
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
              Bảng kê chi tiết các hóa đơn, garage tiếp nhận và số tiền quyết toán thực tế
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="text"
              placeholder="Tìm garage, nội dung..."
              value={maintSearchText}
              onChange={(e) => setMaintSearchText(e.target.value)}
              style={{
                padding: '6px 12px',
                fontSize: '0.78rem',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                outline: 'none',
                width: '180px'
              }}
            />
            <select
              value={maintTypeFilter}
              onChange={(e) => setMaintTypeFilter(e.target.value)}
              style={{
                padding: '6px 10px',
                fontSize: '0.78rem',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                outline: 'none',
                backgroundColor: '#ffffff'
              }}
            >
              <option value="all">Tất cả loại phiếu</option>
              <option value="maintenance">Bảo dưỡng định kỳ</option>
              <option value="repairing">Sửa chữa sự cố</option>
            </select>
          </div>
        </div>

        {filteredMaints.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '0.82rem' }}>
            Không có phiếu nghiệm thu bảo trì nào trong tháng này.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '1050px', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                  <th style={{ padding: '10px 14px', fontWeight: '700', whiteSpace: 'nowrap' }}>NGÀY NGHIỆM THU</th>
                  <th style={{ padding: '10px 14px', fontWeight: '700', whiteSpace: 'nowrap' }}>BIỂN SỐ XE</th>
                  <th style={{ padding: '10px 14px', fontWeight: '700', whiteSpace: 'nowrap' }}>LOẠI DỊCH VỤ</th>
                  <th style={{ padding: '10px 14px', fontWeight: '700', whiteSpace: 'nowrap' }}>GARAGE TIẾP NHẬN</th>
                  <th style={{ padding: '10px 14px', fontWeight: '700', whiteSpace: 'nowrap', minWidth: '340px' }}>NỘI DUNG SỬA CHỮA / BẢO DƯỠNG</th>
                  <th style={{ padding: '10px 14px', fontWeight: '700', textAlign: 'right', whiteSpace: 'nowrap' }}>SỐ TIỀN QUYẾT TOÁN</th>
                </tr>
              </thead>
              <tbody>
                {filteredMaints.map((m, idx) => (
                  <tr key={m.recordId || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px', color: '#64748b', whiteSpace: 'nowrap' }}>{formatDate(m.date)}</td>
                    <td style={{ padding: '10px 14px', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap' }}>{m.plateNumber}</td>
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                      {m.type === 'repairing' ? (
                        <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '2px 7px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '700' }}>
                          Sửa chữa sự cố
                        </span>
                      ) : (
                        <span style={{ backgroundColor: '#fff7ed', color: '#c2410c', padding: '2px 7px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '700' }}>
                          Bảo dưỡng định kỳ
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#334155', fontWeight: '600', whiteSpace: 'nowrap' }}>{m.garage}</td>
                    <td style={{ padding: '10px 14px', color: '#475569', minWidth: '340px', fontSize: '0.78rem', lineHeight: '1.5' }}>
                      <div style={{ whiteSpace: 'normal', wordBreak: 'normal', lineHeight: '1.5' }}>{m.description}</div>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '800', color: '#dc2626', whiteSpace: 'nowrap' }}>
                      {formatCurrency(m.cost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lịch Sử Các Báo Cáo Tháng Đã Nộp */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' }}>
        <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: '0 0 14px 0' }}>
          Lịch Sử Báo Cáo Chi Tiêu Các Tháng
        </h2>

        {historyReports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '0.85rem' }}>
            Chưa có báo cáo chi tiêu nào được lưu trữ cho năm {selectedYear}.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '950px', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                  <th style={{ padding: '10px 14px', fontWeight: '700', whiteSpace: 'nowrap' }}>MÃ BÁO CÁO</th>
                  <th style={{ padding: '10px 14px', fontWeight: '700', whiteSpace: 'nowrap' }}>KỲ BÁO CÁO</th>
                  <th style={{ padding: '10px 14px', fontWeight: '700', textAlign: 'right', whiteSpace: 'nowrap' }}>TỔNG CHI PHÍ BẢO TRÌ</th>
                  <th style={{ padding: '10px 14px', fontWeight: '700', textAlign: 'center', whiteSpace: 'nowrap' }}>LƯỢT XE VÀO XƯỞNG</th>
                  <th style={{ padding: '10px 14px', fontWeight: '700', textAlign: 'right', whiteSpace: 'nowrap' }}>QUÃNG ĐƯỜNG (KM)</th>
                  <th style={{ padding: '10px 14px', fontWeight: '700', textAlign: 'center', whiteSpace: 'nowrap' }}>NGÀY NỘP</th>
                  <th style={{ padding: '10px 14px', fontWeight: '700', textAlign: 'center', whiteSpace: 'nowrap' }}>TRẠNG THÁI</th>
                  <th style={{ padding: '10px 14px', fontWeight: '700', textAlign: 'center', whiteSpace: 'nowrap' }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {historyReports.map((item) => (
                  <tr key={item._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px', fontWeight: '700', color: '#2563eb', whiteSpace: 'nowrap' }}>{item.reportCode}</td>
                    <td style={{ padding: '10px 14px', fontWeight: '700', whiteSpace: 'nowrap' }}>Tháng {item.month}/{item.year}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '800', color: '#dc2626', whiteSpace: 'nowrap' }}>
                      {formatCurrency(item.summary?.totalMaintenanceCost || item.summary?.totalExpenses)}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '600', color: '#475569', whiteSpace: 'nowrap' }}>
                      {item.summary?.maintenanceCount || 0} lượt
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: '#334155', fontWeight: '600', whiteSpace: 'nowrap' }}>
                      {(item.summary?.totalDistanceKm || 0).toLocaleString('vi-VN')} km
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {formatDate(item.submittedAt)}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
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
                    <td style={{ padding: '10px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
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
                        Xem / In
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Xem & In Văn Bản Báo Cáo Tháng */}
      {modalOpen && (
        <MonthlyFleetExpenseReportModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          report={selectedReportForModal}
          canApprove={false}
        />
      )}
    </div>
  );
};

export default FleetMonthlyExpenseReportPage;