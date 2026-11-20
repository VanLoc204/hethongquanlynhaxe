import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const API_BASE = 'http://localhost:8000/api';

const getScenarioBadge = (scenario) => {
  if (scenario === 'need_assistance') {
    return {
      label: 'Cứu hộ khẩn cấp',
      bg: '#fee2e2',
      color: '#b91c1c',
      border: '#fca5a5'
    };
  }
  return {
    label: 'Xin hoàn ứng',
    bg: '#ecfdf5',
    color: '#047857',
    border: '#a7f3d0'
  };
};

const getStatusBadge = (item) => {
  if (item.scenario === 'need_assistance') {
    switch (item.assistanceStatus) {
      case 'contacted':
        return { label: 'Quản lý đã liên hệ', bg: '#fef3c7', color: '#b45309', border: '#fde68a' };
      case 'dispatched':
        return { label: 'Đã điều thợ đến', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
      case 'resolved':
        return { label: 'Đã khắc phục xong', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' };
      default:
        return { label: 'Chờ tiếp nhận', bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' };
    }
  } else {
    switch (item.reimbursementStatus) {
      case 'approved':
        return { label: 'Đã duyệt (Cộng vào lương)', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
      case 'paid':
        return { label: 'Đã quyết toán theo lương', bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' };
      case 'rejected':
        return { label: 'Từ chối duyệt', bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' };
      default:
        return { label: 'Chờ duyệt', bg: '#fef3c7', color: '#b45309', border: '#fde68a' };
    }
  }
};

const DriverIncidentPage = ({ setActiveTab }) => {
  const { token, user } = useContext(AuthContext);

  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Current trip of driver
  const [currentTrip, setCurrentTrip] = useState(null);

  // Filter tabs
  const [scenarioFilter, setScenarioFilter] = useState('all'); // 'all', 'need_assistance', 'self_resolved'

  // Modal create state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeScenario, setActiveScenario] = useState('self_resolved'); // 'self_resolved' | 'need_assistance'
  const [submitting, setSubmitting] = useState(false);

  // Detail Modal state
  const [selectedIncident, setSelectedIncident] = useState(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('tire');
  const [details, setDetails] = useState('');
  const [locationText, setLocationText] = useState('');
  const [reimbursementAmount, setReimbursementAmount] = useState('');
  const [images, setImages] = useState([]);

  // Preview Image Modal
  const [previewImage, setPreviewImage] = useState(null);

  // Fetch Driver's Schedule to get current trip
  const fetchCurrentTrip = async () => {
    try {
      const res = await fetch(`${API_BASE}/users/my-schedule`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success && data.trips && data.trips.length > 0) {
        const todayStr = new Date().toISOString().slice(0, 10);
        const todayTrip = data.trips.find(t => {
          const tripDate = new Date(t.departureTime).toISOString().slice(0, 10);
          return tripDate === todayStr;
        }) || data.trips[0];

        setCurrentTrip(todayTrip);
      }
    } catch (err) {
      console.warn('Lỗi lấy chuyến đi hiện tại của tài xế:', err);
    }
  };

  // Fetch Driver Incidents
  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/driver/incidents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIncidents(data.incidents || []);
      } else {
        setError(data.message || 'Không thể tải danh sách sự cố.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ khi lấy danh sách sự cố.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCurrentTrip();
      fetchIncidents();
    }
  }, [token]);

  // Handle Image Upload (Converts to Base64)
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        alert(`File ${file.name} quá lớn (vui lòng chọn ảnh dưới 5MB).`);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, idx) => idx !== index));
  };

  // Get current device GPS if available
  const handleGetGps = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setLocationText(`GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        },
        () => {
          alert('Không thể lấy tọa độ GPS tự động. Vui lòng nhập vị trí bằng tay (VD: Km 110, QL20).');
        }
      );
    }
  };

  // Submit Incident (chỉ gửi những trường mới, không gửi trường dư thừa)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!details.trim()) {
      alert('Vui lòng nhập mô tả chi tiết sự cố.');
      return;
    }

    if (activeScenario === 'self_resolved') {
      const amt = Number(reimbursementAmount);
      if (isNaN(amt) || amt <= 0) {
        alert('Vui lòng nhập số tiền bạn đã tự ứng chi trả hợp lệ (> 0 đ).');
        return;
      }
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        title: title.trim() || (activeScenario === 'self_resolved' ? `Tự khắc phục: ${details.slice(0, 40)}...` : `Cứu hộ khẩn cấp: ${details.slice(0, 40)}...`),
        scenario: activeScenario,
        category,
        severity: activeScenario === 'need_assistance' ? 'urgent' : 'medium',
        details: details.trim(),
        location: locationText.trim() || 'Trên tuyến đường',
        images,
        reimbursementAmount: activeScenario === 'self_resolved' ? Number(reimbursementAmount) : 0,
        tripId: currentTrip?._id || null
      };

      const res = await fetch(`${API_BASE}/users/driver/incidents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(data.message);
        setShowCreateModal(false);
        // Reset form
        setTitle('');
        setDetails('');
        setLocationText('');
        setReimbursementAmount('');
        setImages([]);
        fetchIncidents();
      } else {
        setError(data.message || 'Lỗi khi gửi báo cáo sự cố.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ khi gửi báo cáo sự cố.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val) => {
    if (!val && val !== 0) return '0 ₫';
    return Number(val).toLocaleString('vi-VN') + ' ₫';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' +
           d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  // KPIs
  const totalCount = incidents.length;
  const needAssistanceCount = incidents.filter(i => i.scenario === 'need_assistance' && i.status !== 'resolved').length;
  const pendingReimburseCount = incidents.filter(i => i.scenario === 'self_resolved' && i.reimbursementStatus === 'pending').length;
  const totalReimbursed = incidents
    .filter(i => i.reimbursementStatus === 'approved' || i.reimbursementStatus === 'paid')
    .reduce((acc, cur) => acc + (Number(cur.reimbursementAmount) || 0), 0);

  const filteredIncidents = incidents.filter(item => {
    if (scenarioFilter === 'need_assistance') return item.scenario === 'need_assistance';
    if (scenarioFilter === 'self_resolved') return item.scenario === 'self_resolved';
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', animation: 'fadeIn 0.25s ease' }}>
      <style>{`
        .driver-box {
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }
        .driver-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.8rem;
          text-align: left;
        }
        .driver-table th {
          background: #f8fafc;
          color: #475569;
          font-weight: 700;
          padding: 10px 12px;
          border-bottom: 2px solid #e2e8f0;
          white-space: nowrap;
        }
        .driver-table td {
          padding: 11px 12px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }
        .driver-table tr:hover td {
          background-color: #f8fafc;
        }
        .tab-btn {
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
        .tab-btn.active {
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
        }
      `}</style>

      {/* Header bar */}
      <div className="driver-box" style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#0f172a' }}>
              Báo Cáo Sự Cố Trên Tuyến
            </h1>
            <span style={{
              background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1',
              padding: '2px 8px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: '700'
            }}>
              Tài Xế
            </span>
          </div>
          <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
            Báo sự cố khẩn cấp yêu cầu cứu hộ hoặc khai báo chi phí đã tự ứng trước để xin hoàn tiền sau chuyến đi.
          </p>
        </div>

        <button
          onClick={() => {
            setShowCreateModal(true);
            setActiveScenario('self_resolved');
          }}
          style={{
            background: '#dc2626', color: '#ffffff', border: 'none',
            padding: '7px 16px', borderRadius: '6px', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer'
          }}
        >
          Báo Cáo Sự Cố Mới
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div style={{ padding: '0.7rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '0.78rem', fontWeight: '600' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ padding: '0.7rem 1rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#166534', fontSize: '0.78rem', fontWeight: '600' }}>
          {success}
        </div>
      )}

      {/* Current Trip Context Banner */}
      {currentTrip && (
        <div style={{
          background: '#f8fafc', border: '1px solid #cbd5e1', borderLeft: '4px solid #2563eb',
          borderRadius: '8px', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', flexWrap: 'wrap', gap: '10px'
        }}>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
              Chuyến xe đang vận hành hôm nay:
            </div>
            <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.88rem', marginTop: '2px' }}>
              {currentTrip.routeId?.startPoint || 'Sài Gòn'} -&gt; {currentTrip.routeId?.endPoint || 'Đà Lạt'} ({new Date(currentTrip.departureTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })})
              &nbsp;• Biển số xe: <strong style={{ color: '#2563eb' }}>{currentTrip.busId?.plateNumber || 'N/A'}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => {
                setShowCreateModal(true);
                setActiveScenario('need_assistance');
              }}
              style={{
                backgroundColor: '#dc2626', color: '#ffffff', border: 'none',
                padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer'
              }}
            >
              Cần cứu viện khẩn cấp
            </button>
            <button
              onClick={() => {
                setShowCreateModal(true);
                setActiveScenario('self_resolved');
              }}
              style={{
                backgroundColor: '#16a34a', color: '#ffffff', border: 'none',
                padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer'
              }}
            >
              Đề xuất hoàn ứng chi phí
            </button>
          </div>
        </div>
      )}

      {/* 4 KPI Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '10px' }}>
        <div className="driver-box" style={{ padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
            Tổng Sự Cố Đã Báo
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a' }}>
            {totalCount} <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>vụ</span>
          </div>
        </div>

        <div className="driver-box" style={{ padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '2px', borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: '700', color: '#dc2626', textTransform: 'uppercase' }}>
            Yêu Cầu Cứu Viện
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: needAssistanceCount > 0 ? '#dc2626' : '#16a34a' }}>
            {needAssistanceCount} <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>chờ điều phối</span>
          </div>
        </div>

        <div className="driver-box" style={{ padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '2px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: '700', color: '#d97706', textTransform: 'uppercase' }}>
            Chờ Duyệt Hoàn Ứng
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: pendingReimburseCount > 0 ? '#d97706' : '#16a34a' }}>
            {pendingReimburseCount} <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>đơn</span>
          </div>
        </div>

        <div className="driver-box" style={{ padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '2px', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: '700', color: '#15803d', textTransform: 'uppercase' }}>
            Tổng Tiền Đã Được Duyệt
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#166534' }}>
            {formatCurrency(totalReimbursed)}
          </div>
        </div>
      </div>

      {/* Main Table Box */}
      <div className="driver-box" style={{ padding: '1rem' }}>
        {/* Controls: Filter tabs & Refresh */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setScenarioFilter('all')}
              className={`tab-btn ${scenarioFilter === 'all' ? 'active' : ''}`}
            >
              Tất cả sự cố ({totalCount})
            </button>
            <button
              onClick={() => setScenarioFilter('need_assistance')}
              className={`tab-btn ${scenarioFilter === 'need_assistance' ? 'active' : ''}`}
            >
              Cần cứu viện ({incidents.filter(i => i.scenario === 'need_assistance').length})
            </button>
            <button
              onClick={() => setScenarioFilter('self_resolved')}
              className={`tab-btn ${scenarioFilter === 'self_resolved' ? 'active' : ''}`}
            >
              Đề xuất hoàn ứng ({incidents.filter(i => i.scenario === 'self_resolved').length})
            </button>
          </div>

          <button
            onClick={fetchIncidents}
            style={{
              padding: '5px 12px', background: '#f8fafc', border: '1px solid #cbd5e1',
              borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', color: '#334155', cursor: 'pointer'
            }}
          >
            Làm mới
          </button>
        </div>

        {/* Compact Table */}
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
            Đang tải dữ liệu sự cố của bạn...
          </div>
        ) : filteredIncidents.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.8rem', background: '#f8fafc', borderRadius: '8px' }}>
            Không có báo cáo sự cố nào trong danh mục này.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="driver-table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>STT</th>
                  <th>Mã sự cố</th>
                  <th>Thời gian</th>
                  <th>Phương tiện &amp; Chuyến</th>
                  <th>Nghiệp vụ</th>
                  <th>Vị trí sự cố</th>
                  <th>Nội dung tóm tắt</th>
                  <th>Chi phí / Mức độ</th>
                  <th>Tiến độ / Trạng thái</th>
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredIncidents.map((item, idx) => {
                  const scBadge = getScenarioBadge(item.scenario);
                  const stBadge = getStatusBadge(item);
                  const plateNumber = item.tripId?.busId?.plateNumber || item.plateNumber || 'N/A';
                  const routeLabel = item.tripId?.routeId?.routeName || (item.tripId?.routeId ? `${item.tripId.routeId.startPoint} - ${item.tripId.routeId.endPoint}` : item.tripId?.tripCode || '');

                  return (
                    <tr key={item._id}>
                      <td style={{ textAlign: 'center', color: '#64748b', fontSize: '0.75rem' }}>{idx + 1}</td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: '700', color: '#1e293b', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                          {item.incidentCode}
                        </span>
                      </td>
                      <td style={{ color: '#64748b', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                        {formatDate(item.createdAt)}
                      </td>
                      <td>
                        <div style={{ fontWeight: '700', color: '#0f172a' }}>{plateNumber}</div>
                        {routeLabel && <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{routeLabel}</div>}
                      </td>
                      <td>
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: '700',
                          backgroundColor: scBadge.bg, color: scBadge.color, border: `1px solid ${scBadge.border}`, whiteSpace: 'nowrap'
                        }}>
                          {scBadge.label}
                        </span>
                      </td>
                      <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#475569' }} title={item.location}>
                        {item.location || 'Trên tuyến'}
                      </td>
                      <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1e293b' }} title={item.title}>
                        {item.title}
                      </td>
                      <td>
                        {item.scenario === 'self_resolved' ? (
                          <strong style={{ color: '#b91c1c', fontSize: '0.8rem' }}>{formatCurrency(item.reimbursementAmount)}</strong>
                        ) : (
                          <span style={{ color: '#dc2626', fontWeight: '700', fontSize: '0.75rem' }}>Khẩn cấp</span>
                        )}
                      </td>
                      <td>
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: '700',
                          backgroundColor: stBadge.bg, color: stBadge.color, border: `1px solid ${stBadge.border}`, whiteSpace: 'nowrap'
                        }}>
                          {stBadge.label}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => setSelectedIncident(item)}
                          style={{
                            padding: '4px 10px', backgroundColor: '#ffffff', color: '#2563eb',
                            border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer'
                          }}
                        >
                          Chi tiết
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

      {/* ========================================================================= */}
      {/* Detail Modal (Hiển thị chi tiết trọn vẹn cho Tài xế)                       */}
      {/* ========================================================================= */}
      {selectedIncident && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(2px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1200
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '12px', width: '92%', maxWidth: '560px',
            maxHeight: '90vh', overflowY: 'auto', padding: '1.25rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem', marginBottom: '0.85rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: '800', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem' }}>
                    {selectedIncident.incidentCode}
                  </span>
                  <span style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: '700',
                    backgroundColor: getScenarioBadge(selectedIncident.scenario).bg,
                    color: getScenarioBadge(selectedIncident.scenario).color
                  }}>
                    {getScenarioBadge(selectedIncident.scenario).label}
                  </span>
                </div>
                <h3 style={{ margin: '4px 0 0', fontSize: '0.95rem', fontWeight: '800', color: '#0f172a' }}>
                  {selectedIncident.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedIncident(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}
              >
                &times;
              </button>
            </div>

            {/* Context Info */}
            <div style={{
              background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px',
              display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '0.75rem', marginBottom: '0.85rem'
            }}>
              <div>
                <span style={{ color: '#64748b' }}>Phương tiện:</span>{' '}
                <strong>{selectedIncident.tripId?.busId?.plateNumber || selectedIncident.plateNumber || 'N/A'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Tuyến xe:</span>{' '}
                <strong>{selectedIncident.tripId?.routeId?.routeName || (selectedIncident.tripId?.routeId ? `${selectedIncident.tripId.routeId.startPoint} - ${selectedIncident.tripId.routeId.endPoint}` : selectedIncident.tripId?.tripCode || 'N/A')}</strong>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ color: '#64748b' }}>Vị trí xe dừng:</span>{' '}
                <strong style={{ color: '#b91c1c' }}>{selectedIncident.location || 'N/A'}</strong>
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: '0.85rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '3px' }}>
                Mô tả tình trạng:
              </div>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px', fontSize: '0.78rem', color: '#334155', lineHeight: '1.4' }}>
                {selectedIncident.details}
              </div>
            </div>

            {/* Photos */}
            {selectedIncident.images && selectedIncident.images.length > 0 && (
              <div style={{ marginBottom: '0.85rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Ảnh hiện trường / Chứng từ hóa đơn ({selectedIncident.images.length}):
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {selectedIncident.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt="Chứng từ"
                      onClick={() => setPreviewImage(img)}
                      style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Assistance status detail */}
            {selectedIncident.scenario === 'need_assistance' && (
              <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', padding: '10px 12px', fontSize: '0.75rem', marginBottom: '0.85rem' }}>
                <div style={{ fontWeight: '700', color: '#9f1239', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Tiến độ cứu hộ từ Quản lý vận tải:
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '800',
                    backgroundColor: getStatusBadge(selectedIncident).bg,
                    color: getStatusBadge(selectedIncident).color
                  }}>
                    {getStatusBadge(selectedIncident).label}
                  </span>
                </div>
                {selectedIncident.assistanceNotes && (
                  <div style={{ marginTop: '6px', color: '#881337' }}>
                    <strong>Chỉ đạo:</strong> "{selectedIncident.assistanceNotes}"
                  </div>
                )}
              </div>
            )}

            {/* Reimbursement status detail */}
            {selectedIncident.scenario === 'self_resolved' && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 12px', fontSize: '0.75rem', marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#166534', fontWeight: '700', textTransform: 'uppercase' }}>
                    Số tiền đề xuất hoàn ứng:
                  </span>
                  <strong style={{ fontSize: '1.05rem', color: '#b91c1c' }}>
                    {formatCurrency(selectedIncident.reimbursementAmount)}
                  </strong>
                </div>
                <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#64748b' }}>Trạng thái:</span>
                  <span style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '800',
                    backgroundColor: getStatusBadge(selectedIncident).bg,
                    color: getStatusBadge(selectedIncident).color
                  }}>
                    {getStatusBadge(selectedIncident).label}
                  </span>
                </div>
                {selectedIncident.reimbursementStatus === 'approved' && (
                  <div style={{ marginTop: '6px', padding: '6px 8px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', color: '#1e40af', fontSize: '0.72rem' }}>
                    Khoản hoàn ứng <strong>{formatCurrency(selectedIncident.reimbursementAmount)}</strong> đã được ghi nhận tự động vào bảng lương tháng này của bạn. Bạn có thể kiểm tra tại mục <strong>Xem bảng lương</strong>.
                  </div>
                )}
                {selectedIncident.reimbursementNote && (
                  <div style={{ marginTop: '6px', color: '#166534' }}>
                    <strong>Ý kiến Quản lý:</strong> "{selectedIncident.reimbursementNote}"
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setSelectedIncident(null)}
                style={{ padding: '6px 14px', fontSize: '0.75rem', fontWeight: '700', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#ffffff', color: '#475569', cursor: 'pointer' }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Modal Báo Cáo Sự Cố Mới (Form gửi tinh gọn)                              */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(2px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1200
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '12px', width: '92%', maxWidth: '560px',
            maxHeight: '90vh', overflowY: 'auto', padding: '1.25rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
          }}>
            {/* Modal Title */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem', marginBottom: '0.85rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>
                  Báo Cáo Sự Cố Hành Trình Xe
                </h3>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                  Tài xế: {user?.name} {currentTrip ? `• Xe: ${currentTrip.busId?.plateNumber || ''}` : ''}
                </span>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}
              >
                &times;
              </button>
            </div>

            {/* 2 Scenario Tabs (Tự Khắc Phục vs Cần Cứu Hộ) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '0.85rem' }}>
              <button
                type="button"
                onClick={() => setActiveScenario('self_resolved')}
                style={{
                  padding: '9px 8px', borderRadius: '8px', cursor: 'pointer', textAlign: 'center',
                  border: `2px solid ${activeScenario === 'self_resolved' ? '#16a34a' : '#e2e8f0'}`,
                  backgroundColor: activeScenario === 'self_resolved' ? '#f0fdf4' : '#ffffff',
                  color: activeScenario === 'self_resolved' ? '#166534' : '#475569'
                }}
              >
                <div style={{ fontSize: '0.82rem', fontWeight: '800' }}>Tự Khắc Phục (Xin Hoàn Ứng)</div>
                <div style={{ fontSize: '0.7rem', marginTop: '2px' }}>Đã tự sửa xong &amp; xin hoàn lại tiền</div>
              </button>

              <button
                type="button"
                onClick={() => setActiveScenario('need_assistance')}
                style={{
                  padding: '9px 8px', borderRadius: '8px', cursor: 'pointer', textAlign: 'center',
                  border: `2px solid ${activeScenario === 'need_assistance' ? '#dc2626' : '#e2e8f0'}`,
                  backgroundColor: activeScenario === 'need_assistance' ? '#fef2f2' : '#ffffff',
                  color: activeScenario === 'need_assistance' ? '#991b1b' : '#475569'
                }}
              >
                <div style={{ fontSize: '0.82rem', fontWeight: '800' }}>Cần Cứu Hộ Khẩn Cấp</div>
                <div style={{ fontSize: '0.7rem', marginTop: '2px' }}>Xe hỏng nặng &amp; cần hỗ trợ</div>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {/* Category */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#0f172a', marginBottom: '3px' }}>
                  Phân loại sự cố:
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                >
                  <option value="tire">Lốp xe (Nổ lốp, cán đinh, thủng săm)</option>
                  <option value="engine">Động cơ / Hộp số (Sôi nước, chết máy, đứt curoa)</option>
                  <option value="vehicle">Hệ thống điện / Điều hòa / Phanh</option>
                  <option value="traffic">Va quẹt giao thông / Va chạm</option>
                  <option value="other">Sự cố khác trên đường</option>
                </select>
              </div>

              {/* Location */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#0f172a' }}>
                    Vị trí hiện tại của xe:
                  </label>
                  <button
                    type="button"
                    onClick={handleGetGps}
                    style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.7rem', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Lấy tọa độ GPS tự động
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="VD: Km 115 QL20, Đèo Chuối hoặc Đèo Bảo Lộc..."
                  value={locationText}
                  onChange={e => setLocationText(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                />
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#0f172a', marginBottom: '3px' }}>
                  Mô tả tình trạng chi tiết:
                </label>
                <textarea
                  rows="3"
                  placeholder={
                    activeScenario === 'self_resolved'
                      ? 'VD: Xe bị nổ lốp sau bên phụ lúc 14:15, ghé tiệm lốp Minh Phát ven đường vá săm và thay van hơi...'
                      : 'VD: Xe đang leo đèo thì báo nhiệt độ cao, bốc khói khoang máy, xe chết máy dừng sát lề không nổ lại được...'
                  }
                  value={details}
                  onChange={e => setDetails(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                  required
                />
              </div>

              {/* CASE A: Reimbursement Amount & Invoice Photo */}
              {activeScenario === 'self_resolved' && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: '#166534', marginBottom: '3px' }}>
                      Số tiền tài xế đã tự chi trả (₫) - Cần xin hoàn ứng:
                    </label>
                    <input
                      type="number"
                      placeholder="VD: 350000"
                      value={reimbursementAmount}
                      onChange={e => setReimbursementAmount(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', fontSize: '0.88rem', fontWeight: '800', color: '#0f172a', border: '1px solid #86efac', borderRadius: '6px', boxSizing: 'border-box' }}
                      required
                    />
                    <div style={{ fontSize: '0.68rem', color: '#15803d', marginTop: '2px' }}>
                      Số tiền sẽ được trình Quản lý vận tải đối chiếu và hoàn lại tiền mặt/chuyển khoản sau chuyến đi.
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#166534', marginBottom: '3px' }}>
                      Chụp / Tải ảnh hóa đơn, biên lai tiệm sửa xe hoặc hiện trường:
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageChange}
                      style={{ fontSize: '0.75rem' }}
                    />
                    {images.length > 0 && (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                        {images.map((img, idx) => (
                          <div key={idx} style={{ position: 'relative', width: '56px', height: '56px' }}>
                            <img src={img} alt="Bill" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                            <button
                              type="button"
                              onClick={() => removeImage(idx)}
                              style={{
                                position: 'absolute', top: -4, right: -4, background: '#ef4444', color: '#fff',
                                border: 'none', borderRadius: '50%', width: '16px', height: '16px', cursor: 'pointer',
                                fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                              }}
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* CASE B: Urgent Warning */}
              {activeScenario === 'need_assistance' && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 12px', color: '#991b1b', fontSize: '0.74rem', lineHeight: '1.4' }}>
                  <strong>LƯU Ý KHẨN CẤP:</strong> Khi bạn bấm gửi, hệ thống sẽ phát tín hiệu khẩn cấp đến Quản lý Vận tải. Quản lý sẽ gọi điện ngay cho bạn và tự liên hệ gara/cứu hộ khu vực gần đó tới giúp. Hãy đỗ xe an toàn và bật đèn cảnh báo nguy hiểm!
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={submitting}
                  style={{ padding: '7px 14px', fontSize: '0.78rem', fontWeight: '700', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#ffffff', color: '#475569', cursor: 'pointer' }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '7px 18px', fontSize: '0.8rem', fontWeight: '800', border: 'none', borderRadius: '6px',
                    backgroundColor: activeScenario === 'need_assistance' ? '#dc2626' : '#16a34a', color: '#ffffff', cursor: submitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submitting
                    ? 'Đang gửi...'
                    : activeScenario === 'need_assistance'
                    ? 'Gửi Yêu Cầu Cứu Viện'
                    : 'Gửi Đề Xuất Hoàn Ứng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Image Modal */}
      {previewImage && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(3px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1300
        }}>
          <div style={{ maxWidth: '90%', maxHeight: '90%', position: 'relative' }}>
            <img src={previewImage} alt="Chứng từ preview" style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '8px' }} />
            <div style={{ textAlign: 'center', marginTop: '8px' }}>
              <button
                onClick={() => setPreviewImage(null)}
                style={{ padding: '6px 16px', background: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}
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

export default DriverIncidentPage;
