import React, { useState, useEffect, useContext, useMemo } from 'react';
import API_BASE_URL from '../../config/api';
import { AuthContext } from '../../context/AuthContext';

const API_BASE = API_BASE_URL;

// Technical maintenance cycle thresholds (km)
const COMPONENT_THRESHOLDS = {
  oil: { name: 'Dầu nhớt & Lọc động cơ', cycleKm: 10000, baseCost: 950000 },
  brakes: { name: 'Hệ thống phanh & Má phanh', cycleKm: 25000, baseCost: 1800000 },
  tires: { name: 'Lốp xe & Rãnh gai chịu tải', cycleKm: 50000, baseCost: 5500000 },
  cooling: { name: 'Hệ thống làm mát & Điều hòa', cycleKm: 20000, baseCost: 1200000 },
  battery: { name: 'Ắc quy & Hệ thống điện/Lọc gió', cycleKm: 30000, baseCost: 850000 }
};

const FleetForecastPage = () => {
  const { token } = useContext(AuthContext);

  const [fleetAnalytics, setFleetAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBusId, setSelectedBusId] = useState(null);
  const [filterRisk, setFilterRisk] = useState('all'); // 'all' | 'high' | 'medium' | 'good'
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Modal to book/dispatch maintenance
  const [dispatchModalBus, setDispatchModalBus] = useState(null);
  const [dispatchGarage, setDispatchGarage] = useState('Garage Thiên Phúc');
  const [dispatchDescription, setDispatchDescription] = useState('');
  const [dispatchEstimatedCost, setDispatchEstimatedCost] = useState('');
  const [dispatchEstimatedCompletion, setDispatchEstimatedCompletion] = useState('');
  const [loadingDispatch, setLoadingDispatch] = useState(false);

  // Fetch forecast data calculated from Backend Controller & Service
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/trips/fleet/forecast`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const analytics = data.fleetAnalytics || [];
        setFleetAnalytics(analytics);
        if (analytics.length > 0 && !selectedBusId) {
          setSelectedBusId(analytics[0].bus._id);
        }
      } else {
        setErrorMsg(data.message || 'Lỗi khi tải dữ liệu dự báo từ máy chủ.');
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu dự báo:', err);
      setErrorMsg('Không thể kết nối máy chủ để lấy dữ liệu vận hành.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  // Overall fleet KPIs
  const totalFleetKm = useMemo(() => {
    return fleetAnalytics.reduce((sum, a) => sum + a.totalKm, 0);
  }, [fleetAnalytics]);

  const totalFleetTrips = useMemo(() => {
    return fleetAnalytics.reduce((sum, a) => sum + (a.tripCount || 0), 0);
  }, [fleetAnalytics]);

  const avgFleetHealth = useMemo(() => {
    if (fleetAnalytics.length === 0) return 100;
    return Math.round(fleetAnalytics.reduce((sum, a) => sum + a.healthScore, 0) / fleetAnalytics.length);
  }, [fleetAnalytics]);

  const urgentCount = useMemo(() => {
    return fleetAnalytics.filter(a => a.riskLevel === 'high').length;
  }, [fleetAnalytics]);

  const totalForecastBudget = useMemo(() => {
    return fleetAnalytics.reduce((sum, a) => sum + a.predictedCost, 0);
  }, [fleetAnalytics]);

  // Selected bus analytics
  const selectedBusAnalytics = useMemo(() => {
    if (!selectedBusId) return fleetAnalytics[0] || null;
    return fleetAnalytics.find(a => a.bus._id === selectedBusId) || fleetAnalytics[0] || null;
  }, [fleetAnalytics, selectedBusId]);

  // Filtered list
  const filteredFleet = useMemo(() => {
    if (filterRisk === 'all') return fleetAnalytics;
    return fleetAnalytics.filter(a => a.riskLevel === filterRisk);
  }, [fleetAnalytics, filterRisk]);

  const formatCurrency = (val) => {
    if (!val && val !== 0) return '0 đ';
    return Number(val).toLocaleString('vi-VN') + ' đ';
  };

  const formatDate = (d) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('vi-VN');
  };

  // Open Dispatch Modal
  const handleOpenDispatch = (item) => {
    setDispatchModalBus(item);
    setDispatchGarage('Garage Thiên Phúc');

    // Lấy các hạng mục kỹ thuật vượt mức yêu cầu (hao mòn >= 70%)
    const dueComponents = (item.components || []).filter(c => c.wear >= 70);
    const desc = dueComponents.length > 0
      ? `Bảo dưỡng kỹ thuật: ${dueComponents.map(c => c.name).join(', ')}`
      : `Bảo dưỡng kỹ thuật: ${item.highestWear?.name || 'Kiểm tra định kỳ'}`;

    setDispatchDescription(desc);
    setDispatchEstimatedCost(item.predictedCost);
    if (item.nextDate) {
      const d = new Date(item.nextDate);
      setDispatchEstimatedCompletion(d.toISOString().substring(0, 10));
    } else {
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 7);
      setDispatchEstimatedCompletion(defaultDate.toISOString().substring(0, 10));
    }
  };

  // Confirm Dispatch to Maintenance
  const handleConfirmDispatch = async (e) => {
    e.preventDefault();
    if (!dispatchModalBus) return;

    if (!dispatchGarage || !dispatchGarage.trim()) {
      setErrorMsg('Vui lòng nhập Tên xưởng / Garage tiếp nhận phương tiện.');
      return;
    }
    if (!dispatchDescription || !dispatchDescription.trim()) {
      setErrorMsg('Vui lòng nhập Nội dung thực hiện bảo dưỡng kỹ thuật.');
      return;
    }
    if (dispatchEstimatedCost === '' || dispatchEstimatedCost === null || dispatchEstimatedCost === undefined) {
      setErrorMsg('Vui lòng nhập Chi phí dự kiến.');
      return;
    }
    const costNum = Number(dispatchEstimatedCost);
    if (isNaN(costNum) || costNum < 0) {
      setErrorMsg('Chi phí dự kiến phải là một số hợp lệ lớn hơn hoặc bằng 0.');
      return;
    }
    if (!dispatchEstimatedCompletion) {
      setErrorMsg('Vui lòng chọn Ngày dự kiến hoàn tất.');
      return;
    }

    setLoadingDispatch(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const busId = dispatchModalBus.bus._id;
      const compDate = new Date(dispatchEstimatedCompletion);

      // 1. Cập nhật trạng thái phương tiện sang 'maintenance'
      const res = await fetch(`${API_BASE}/trips/fleet/buses/${busId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          activeStatus: 'maintenance',
          maintenanceInfo: {
            description: dispatchDescription.trim(),
            garage: dispatchGarage.trim(),
            estimatedCompletion: compDate,
            estimatedCost: costNum
          }
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // 2. Ghi nhật ký điều chuyển vào MongoDB BusStatusLog để đồng bộ sổ theo dõi kỹ thuật
        try {
          await fetch(`${API_BASE}/trips/fleet/status-logs`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              busId: dispatchModalBus.bus._id,
              plateNumber: dispatchModalBus.bus.plateNumber,
              busType: dispatchModalBus.bus.type,
              fromStatus: dispatchModalBus.bus.activeStatus || 'ready',
              toStatus: 'maintenance',
              time: new Date().toISOString(),
              details: `Chuyển trạng thái sang: Đang bảo dưỡng. Nơi thực hiện: ${dispatchGarage.trim()}. Nội dung: ${dispatchDescription.trim()}. Ngày dự kiến xong: ${compDate.toLocaleDateString('vi-VN')}. Chi phí dự kiến: ${costNum.toLocaleString('vi-VN')} VNĐ.`,
              garage: dispatchGarage.trim(),
              cost: costNum,
              approvalStatus: costNum >= 10000000 ? 'pending' : 'approved'
            })
          });
        } catch (logErr) {
          console.error('Lỗi lưu nhật ký trạng thái xe vào CSDL:', logErr);
        }

        setSuccessMsg(`Đã lập lệnh chuyển xe ${dispatchModalBus.bus.plateNumber} vào xưởng bảo dưỡng kỹ thuật thành công!`);
        setDispatchModalBus(null);
        await fetchData();
      } else {
        setErrorMsg(data.message || 'Lỗi khi cập nhật trạng thái bảo dưỡng.');
      }
    } catch (err) {
      setErrorMsg('Lỗi kết nối máy chủ khi chuyển bảo dưỡng.');
    } finally {
      setLoadingDispatch(false);
    }
  };

  // Direct Acceptance: Xác nhận nghiệm thu hoàn tất xuất xưởng & Reset thanh hao mòn kỹ thuật về số km ban đầu
  const handleConfirmAcceptance = async (item) => {
    if (!item || !item.bus) return;
    const bus = item.bus;

    const cost = Number(bus.maintenanceInfo?.estimatedCost || item.predictedCost || 0);
    const garageName = bus.maintenanceInfo?.garage?.trim() || 'Garage Thiên Phúc';
    const dueComponents = (item.components || []).filter(c => c.wear >= 70);
    const defaultDesc = dueComponents.length > 0
      ? `Bảo dưỡng kỹ thuật hoàn tất: ${dueComponents.map(c => c.name).join(', ')}`
      : `Bảo dưỡng kỹ thuật hoàn tất: ${item.highestWear?.name || 'Kiểm tra định kỳ'}`;
    const desc = bus.maintenanceInfo?.description?.trim() || defaultDesc;

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload = {
        busId: bus._id,
        plateNumber: bus.plateNumber,
        type: bus.activeStatus || 'maintenance',
        description: desc,
        garage: garageName,
        cost: cost,
        startDate: bus.updatedAt || new Date(),
        endDate: new Date()
      };

      const res = await fetch(`${API_BASE}/trips/fleet/maintenance-records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(`Xác nhận nghiệm thu xuất xưởng xe ${bus.plateNumber} thành công! Phương tiện đã chuyển về trạng thái Sẵn sàng hoạt động và các thanh dự báo hao mòn kỹ thuật đã được reset về số km ban đầu.`);
        await fetchData();
      } else {
        setErrorMsg(data.message || 'Lỗi khi nghiệm thu phương tiện.');
      }
    } catch (err) {
      setErrorMsg('Lỗi kết nối máy chủ khi nghiệm thu.');
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = (wear) => {
    if (wear >= 85) return '#dc2626'; // red
    if (wear >= 70) return '#ea580c'; // orange
    return '#16a34a'; // green
  };

  return (
    <div style={{ animation: 'fadeIn 0.35s ease', display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
      <style>{`
        .plate-box {
          display: inline-block;
          background: #ffffff;
          border: 2px solid #0f172a;
          border-radius: 6px;
          padding: 2px 8px;
          font-family: monospace;
          font-weight: 800;
          font-size: 0.88rem;
          color: #0f172a;
          letter-spacing: 0.5px;
          white-space: nowrap;
          box-shadow: 0 1px 2px rgba(0,0,0,0.04);
        }

        .plate-box-mini {
          display: inline-block;
          background: #ffffff;
          border: 1.5px solid #0f172a;
          border-radius: 5px;
          padding: 1px 6px;
          font-family: monospace;
          font-weight: 800;
          font-size: 0.74rem;
          color: #0f172a;
          letter-spacing: 0.5px;
          white-space: nowrap;
        }

        .forecast-kpi-card {
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          padding: 0.9rem 1.1rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .forecast-grid {
          display: grid;
          grid-template-columns: 310px minmax(0, 1fr);
          gap: 12px;
          align-items: start;
        }

        .bus-pick-card {
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 0.75rem 0.9rem;
          background-color: #ffffff;
          cursor: pointer;
          transition: all 0.15s ease;
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          box-sizing: border-box;
        }
        .bus-pick-card:hover {
          background-color: #f8fafc;
          border-color: #cbd5e1;
        }
        .bus-pick-card.active {
          background-color: #eff6ff;
          border-color: #3b82f6;
          box-shadow: 0 2px 6px rgba(37,99,235,0.08);
        }

        .forecast-table th {
          background: #f8fafc;
          padding: 8px 10px;
          font-size: 0.72rem;
          font-weight: 700;
          color: #475569;
          letter-spacing: 0.2px;
          border-bottom: 1px solid #e2e8f0;
          white-space: nowrap;
        }

        .forecast-table td {
          padding: 8px 10px;
          font-size: 0.74rem;
          color: #1e293b;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
          white-space: nowrap;
        }

        .filter-chip {
          padding: 5px 12px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #475569;
          transition: all 0.15s ease;
        }
        .filter-chip.active {
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
        }

        @media (max-width: 1100px) {
          .forecast-grid {
            grid-template-columns: 1fr;
          }
          .forecast-kpi-container {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 640px) {
          .forecast-kpi-container {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {/* Header bar */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '1rem 1.25rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>
            Dự Báo Bảo Trì & Sức Khỏe Kỹ Thuật Đội Xe
          </h1>
          <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
            Dự báo ước tính mức độ hao mòn và chu kỳ bảo trì dựa trên lịch trình thực tế, tự động loại trừ chuyến trùng thời điểm nằm xưởng.
          </p>
        </div>

        <button
          onClick={fetchData}
          style={{
            padding: '6px 14px',
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            fontSize: '0.78rem',
            fontWeight: '700',
            color: '#334155',
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}
        >
          Làm mới phân tích
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div style={{
          padding: '0.75rem 1rem',
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          color: '#166534',
          fontSize: '0.82rem',
          fontWeight: '600'
        }}>
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div style={{
          padding: '0.75rem 1rem',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          color: '#991b1b',
          fontSize: '0.82rem',
          fontWeight: '600'
        }}>
          {errorMsg}
        </div>
      )}

      {/* Top KPI Cards */}
      <div
        className="forecast-kpi-container"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: '10px'
        }}
      >
        <div className="forecast-kpi-card">
          <div style={{ fontSize: '0.74rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
            Điểm Sức Khỏe Toàn Đội
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '2px' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: '800', color: avgFleetHealth >= 80 ? '#16a34a' : '#d97706' }}>
              {avgFleetHealth}%
            </span>
            <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: '600' }}>
              chuẩn kỹ thuật
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: avgFleetHealth >= 80 ? '#166534' : '#92400e', fontWeight: '600' }}>
            {avgFleetHealth >= 80 ? 'Toàn bộ đội xe an toàn' : 'Cần chú ý một số phương tiện'}
          </div>
        </div>

        <div className="forecast-kpi-card">
          <div style={{ fontSize: '0.74rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
            Cần Bảo Dưỡng Sớm
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '2px' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: '800', color: urgentCount > 0 ? '#dc2626' : '#16a34a' }}>
              {urgentCount}
            </span>
            <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: '600' }}>
              phương tiện
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: urgentCount > 0 ? '#991b1b' : '#166534', fontWeight: '600' }}>
            {urgentCount > 0 ? 'Có chi tiết đạt ngưỡng > 85%' : 'Không có xe quá ngưỡng'}
          </div>
        </div>

        <div className="forecast-kpi-card">
          <div style={{ fontSize: '0.74rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
            Tổng Km Vận Hành Tích Lũy
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '2px' }}>
            <span style={{ fontSize: '1.45rem', fontWeight: '800', color: '#0f172a' }}>
              {totalFleetKm.toLocaleString('vi-VN')}
            </span>
            <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: '600' }}>
              km
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#475569', fontWeight: '600' }}>
            {totalFleetTrips} chuyến thực tế
          </div>
        </div>

        <div className="forecast-kpi-card">
          <div style={{ fontSize: '0.74rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
            Dự Toán Ngân Sách Tới Kỳ
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '2px' }}>
            <span style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0f172a' }}>
              {formatCurrency(totalForecastBudget)}
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#475569', fontWeight: '600' }}>
            Dự trù thay thế linh kiện 5 xe
          </div>
        </div>
      </div>

      {/* Main 2-column layout: Left = Bus selector; Right = Deep component breakdown */}
      <div className="forecast-grid">

        {/* Left Column: List of 5 Buses */}
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          padding: '1.1rem 1.15rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', paddingBottom: '0.6rem', borderBottom: '1px solid #f1f5f9' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '0.98rem', fontWeight: '800', color: '#0f172a' }}>
                Danh Sách Phương Tiện
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: '#64748b' }}>
                Chọn xe để xem chi tiết 5 hạng mục
              </p>
            </div>
            <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#475569' }}>
              5 xe
            </span>
          </div>

          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
              Đang phân tích dữ liệu xe...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {fleetAnalytics.map((item) => {
                const isSelected = selectedBusId === item.bus._id;
                const isHigh = item.riskLevel === 'high';
                const isMedium = item.riskLevel === 'medium';

                return (
                  <div
                    key={item.bus._id}
                    onClick={() => setSelectedBusId(item.bus._id)}
                    className={`bus-pick-card ${isSelected ? 'active' : ''}`}
                  >
                    <div>
                      <div className="plate-box-mini">{item.bus.plateNumber}</div>
                      <div style={{ fontWeight: '700', fontSize: '0.78rem', color: '#0f172a', marginTop: '3px' }}>
                        {item.bus.type}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                        {item.tripCount} chuyến • {item.totalKm.toLocaleString('vi-VN')} km
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      {(item.bus.activeStatus === 'maintenance' || item.bus.activeStatus === 'repairing') ? (
                        <span style={{
                          fontSize: '0.65rem',
                          fontWeight: '800',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: '#fff7ed',
                          color: '#c2410c',
                          border: '1px solid #fed7aa',
                          whiteSpace: 'nowrap'
                        }}>
                          Đang trong xưởng
                        </span>
                      ) : (
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: '700',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: isHigh ? '#fee2e2' : isMedium ? '#fef3c7' : '#ecfdf5',
                          color: isHigh ? '#b91c1c' : isMedium ? '#b45309' : '#15803d',
                          whiteSpace: 'nowrap'
                        }}>
                          {item.riskLabel}
                        </span>
                      )}
                      <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#0f172a' }}>
                        SK: {item.healthScore}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Detailed Component Wear Analysis */}
        {selectedBusAnalytics ? (
          <div style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '1.25rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            {/* Top info card of selected bus */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              paddingBottom: '0.85rem',
              borderBottom: '1px solid #f1f5f9'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="plate-box">{selectedBusAnalytics.bus.plateNumber}</div>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '1rem', color: '#0f172a' }}>
                    {selectedBusAnalytics.bus.type}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                    Sức chứa: {selectedBusAnalytics.bus.totalSeats} chỗ • Tổng tích lũy: {selectedBusAnalytics.totalKm.toLocaleString('vi-VN')} km ({selectedBusAnalytics.tripCount} chuyến thực tế)
                  </div>
                  <div style={{ display: 'flex', gap: '14px', marginTop: '5px', fontSize: '0.72rem', color: '#475569', flexWrap: 'wrap' }}>
                    <span>Cường độ: <strong style={{ color: '#0f172a' }}>{selectedBusAnalytics.avgDailyKm} km/ngày</strong></span>
                    <span>Thời gian xưởng: <strong style={{ color: '#0f172a' }}>{selectedBusAnalytics.workshopDays} ngày</strong></span>
                    <span>Ngày lăn bánh: <strong style={{ color: '#0f172a' }}>{selectedBusAnalytics.activeOperatingDays} ngày</strong></span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
                    Dự kiến vào xưởng
                  </div>
                  <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#0f172a' }}>
                    {formatDate(selectedBusAnalytics.nextDate)} (~{selectedBusAnalytics.daysUntil} ngày)
                  </div>
                </div>

                {(selectedBusAnalytics.bus.activeStatus === 'maintenance' || selectedBusAnalytics.bus.activeStatus === 'repairing') ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      backgroundColor: '#fff7ed',
                      color: '#c2410c',
                      border: '1px solid #fed7aa',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: '800'
                    }}>
                      Đang trong xưởng ({selectedBusAnalytics.bus.maintenanceInfo?.garage || 'Xưởng nội bộ'})
                    </span>
                    <button
                      onClick={() => handleConfirmAcceptance(selectedBusAnalytics)}
                      style={{
                        backgroundColor: '#059669',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '7px 14px',
                        fontSize: '0.76rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        boxShadow: '0 1px 2px rgba(5,150,105,0.2)'
                      }}
                    >
                      Nghiệm thu hoàn tất xuất xưởng
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleOpenDispatch(selectedBusAnalytics)}
                    style={{
                      backgroundColor: '#0f172a',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '7px 14px',
                      fontSize: '0.76rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}
                  >
                    Đưa Vào Bảo Dưỡng
                  </button>
                )}
              </div>
            </div>

            {/* Recommendation banner */}
            <div style={{
              backgroundColor: selectedBusAnalytics.riskLevel === 'high' ? '#fef2f2' : '#f8fafc',
              border: `1px solid ${selectedBusAnalytics.riskLevel === 'high' ? '#fecaca' : '#e2e8f0'}`,
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: '700', color: selectedBusAnalytics.riskLevel === 'high' ? '#991b1b' : '#334155', textTransform: 'uppercase' }}>
                  Khuyến nghị kỹ thuật dự báo
                </div>
                <div style={{ fontSize: '0.8rem', color: '#1e293b', fontWeight: '600', marginTop: '2px' }}>
                  {selectedBusAnalytics.recommendation}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Dự toán chi phí</div>
                <div style={{ fontSize: '0.88rem', fontWeight: '800', color: '#0f172a' }}>
                  {formatCurrency(selectedBusAnalytics.predictedCost)}
                </div>
              </div>
            </div>

            {/* 5 Technical Wear Bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                Mức Độ Tiêu Hao 5 Cụm Chi Tiết Kỹ Thuật
              </div>

              {selectedBusAnalytics.components.map((comp) => {
                const color = getProgressColor(comp.wear);
                return (
                  <div
                    key={comp.key}
                    style={{
                      border: '1px solid #f1f5f9',
                      borderRadius: '8px',
                      padding: '0.75rem 0.9rem',
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '5px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontWeight: '700', fontSize: '0.8rem', color: '#0f172a' }}>
                          {comp.name}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: '8px' }}>
                          (Chu kỳ định mức: {comp.cycleKm.toLocaleString('vi-VN')} km)
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          Còn lại: <strong>{comp.remainKm.toLocaleString('vi-VN')} km</strong>
                        </span>
                        <span style={{
                          fontSize: '0.76rem',
                          fontWeight: '800',
                          color: color,
                          minWidth: '42px',
                          textAlign: 'right'
                        }}>
                          {comp.wear}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Track */}
                    <div style={{
                      width: '100%',
                      height: '8px',
                      backgroundColor: '#f1f5f9',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${comp.wear}%`,
                        height: '100%',
                        backgroundColor: color,
                        borderRadius: '4px',
                        transition: 'width 0.4s ease'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Note about forecast methodology */}
            <div style={{
              marginTop: '4px',
              padding: '8px 12px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '0.72rem',
              color: '#64748b',
              lineHeight: '1.4'
            }}>
              <strong style={{ color: '#334155' }}>Ghi chú mô hình dự báo:</strong> Số liệu cự ly và ngày vào xưởng là chỉ số ước tính dựa trên lịch sử vận hành thực tế. Hệ thống tự động so khớp thời điểm nghiệm thu xuất xưởng thực tế (Timestamp) với giờ khởi hành của từng chuyến xe để đảm bảo tính chuẩn xác.
            </div>

          </div>
        ) : null}

      </div>

      {/* Fleet Maintenance Cycle Matrix Table */}
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        padding: '1.1rem 1.25rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '0.98rem', fontWeight: '800', color: '#0f172a' }}>
              Ma Trận Chu Kỳ Bảo Dưỡng Toàn Đội Xe
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
              Bảng so sánh tổng quan mức độ hao mòn, thời hạn vào xưởng và dự toán chi phí toàn bộ phương tiện.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className={`filter-chip ${filterRisk === 'all' ? 'active' : ''}`}
              onClick={() => setFilterRisk('all')}
            >
              Tất cả (5)
            </button>
            <button
              className={`filter-chip ${filterRisk === 'high' ? 'active' : ''}`}
              onClick={() => setFilterRisk('high')}
            >
              Cần bảo dưỡng
            </button>
            <button
              className={`filter-chip ${filterRisk === 'medium' ? 'active' : ''}`}
              onClick={() => setFilterRisk('medium')}
            >
              Cần theo dõi
            </button>
            <button
              className={`filter-chip ${filterRisk === 'good' ? 'active' : ''}`}
              onClick={() => setFilterRisk('good')}
            >
              Tối ưu
            </button>
          </div>
        </div>

        {/* Matrix Table: single line, no horizontal scroll */}
        <div style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <table className="forecast-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr>
                <th>Biển số</th>
                <th>Loại phương tiện</th>
                <th>Tổng km tích lũy</th>
                <th>Điểm sức khỏe</th>
                <th>Chi tiết hao mòn cao nhất</th>
                <th>Dự kiến vào xưởng</th>
                <th style={{ textAlign: 'right' }}>Dự toán chi phí</th>
                <th style={{ textAlign: 'center' }}>Trạng thái rủi ro</th>
                <th style={{ textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredFleet.map((item) => {
                const isHigh = item.riskLevel === 'high';
                const isMedium = item.riskLevel === 'medium';

                return (
                  <tr key={item.bus._id}>
                    <td>
                      <div className="plate-box-mini">{item.bus.plateNumber}</div>
                    </td>
                    <td style={{ fontWeight: '600' }}>
                      {item.bus.type}
                    </td>
                    <td style={{ color: '#475569' }}>
                      <div style={{ fontWeight: '600' }}>{item.totalKm.toLocaleString('vi-VN')} km</div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '1px' }}>
                        {item.tripCount} chuyến thực tế • {item.avgDailyKm} km/ngày
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '45px', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${item.healthScore}%`,
                            height: '100%',
                            backgroundColor: item.healthScore >= 80 ? '#16a34a' : '#d97706'
                          }} />
                        </div>
                        <span style={{ fontWeight: '700', fontSize: '0.72rem' }}>{item.healthScore}%</span>
                      </div>
                    </td>
                    <td>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        color: getProgressColor(item.highestWear.wear)
                      }}>
                        {item.highestWear.name} ({item.highestWear.wear}%)
                      </span>
                    </td>
                    <td style={{ color: '#334155' }}>
                      {formatDate(item.nextDate)} (~{item.daysUntil} ngày)
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '800', color: '#0f172a' }}>
                      {formatCurrency(item.predictedCost)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: '700',
                        padding: '2px 7px',
                        borderRadius: '4px',
                        backgroundColor: isHigh ? '#fee2e2' : isMedium ? '#fef3c7' : '#ecfdf5',
                        color: isHigh ? '#b91c1c' : isMedium ? '#b45309' : '#15803d',
                        display: 'inline-block'
                      }}>
                        {item.riskLabel}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                        <button
                          onClick={() => setSelectedBusId(item.bus._id)}
                          style={{
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            padding: '3px 8px',
                            fontSize: '0.7rem',
                            fontWeight: '700',
                            color: '#334155',
                            cursor: 'pointer'
                          }}
                        >
                          Chi tiết
                        </button>

                        {(item.bus.activeStatus === 'maintenance' || item.bus.activeStatus === 'repairing') ? (
                          <button
                            onClick={() => handleConfirmAcceptance(item)}
                            style={{
                              background: '#059669',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '3px 8px',
                              fontSize: '0.7rem',
                              fontWeight: '700',
                              color: '#ffffff',
                              cursor: 'pointer'
                            }}
                            title="Xác nhận nghiệm thu xuất xưởng và reset chu kỳ hao mòn"
                          >
                            Nghiệm thu
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenDispatch(item)}
                            style={{
                              background: '#0f172a',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '3px 8px',
                              fontSize: '0.7rem',
                              fontWeight: '700',
                              color: '#ffffff',
                              cursor: 'pointer'
                            }}
                          >
                            Vào xưởng
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
      </div>

      {/* Dispatch to Maintenance Modal */}
      {dispatchModalBus && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(15, 23, 42, 0.55)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1200
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '14px',
            width: '90%',
            maxWidth: '520px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)',
            padding: '1.4rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700', color: '#64748b' }}>
                  Lập Lệnh Bảo Dưỡng Kỹ Thuật
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <div className="plate-box-mini">{dispatchModalBus.bus.plateNumber}</div>
                  <span style={{ fontWeight: '800', fontSize: '0.9rem', color: '#0f172a' }}>
                    {dispatchModalBus.bus.type}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setDispatchModalBus(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleConfirmDispatch} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Trạng thái vận hành mới */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.76rem', fontWeight: '700', color: '#334155' }}>
                  Trạng thái vận hành mới
                </label>
                <div style={{
                  padding: '9px 12px',
                  fontSize: '0.84rem',
                  fontWeight: '700',
                  backgroundColor: '#fff7ed',
                  color: '#c2410c',
                  border: '1px solid #fed7aa',
                  borderRadius: '6px'
                }}>
                  Đang bảo dưỡng
                </div>
              </div>

              {/* Khung màu cam THÔNG TIN XƯỞNG BẢO DƯỠNG & SỬA CHỮA */}
              <div style={{
                backgroundColor: '#fffaf5',
                border: '1px solid #fed7aa',
                borderRadius: '8px',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{
                  fontWeight: '800',
                  color: '#c2410c',
                  fontSize: '0.78rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px'
                }}>
                  THÔNG TIN XƯỞNG BẢO DƯỠNG & SỬA CHỮA
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.76rem', fontWeight: '700', color: '#334155' }}>
                    Garage / Nơi thực hiện *
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Garage Thiên Phúc, Hyundai Service..."
                    value={dispatchGarage}
                    onChange={(e) => setDispatchGarage(e.target.value)}
                    required
                    style={{
                      padding: '8px 12px',
                      fontSize: '0.84rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      backgroundColor: '#ffffff',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.76rem', fontWeight: '700', color: '#334155' }}>
                    Nội dung thực hiện *
                  </label>
                  <textarea
                    rows="2"
                    placeholder="Ví dụ: Thay dầu động cơ, lọc gió, kiểm tra phanh..."
                    value={dispatchDescription}
                    onChange={(e) => setDispatchDescription(e.target.value)}
                    required
                    style={{
                      padding: '8px 12px',
                      fontSize: '0.84rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      backgroundColor: '#ffffff',
                      outline: 'none',
                      resize: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.76rem', fontWeight: '700', color: '#334155' }}>
                      Chi phí dự kiến (VNĐ) *
                    </label>
                    <input
                      type="number"
                      placeholder="Ví dụ: 800000"
                      value={dispatchEstimatedCost}
                      onChange={(e) => setDispatchEstimatedCost(e.target.value)}
                      required
                      min="0"
                      style={{
                        padding: '8px 12px',
                        fontSize: '0.84rem',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        backgroundColor: '#ffffff',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.76rem', fontWeight: '700', color: '#334155' }}>
                      Ngày dự kiến hoàn tất *
                    </label>
                    <input
                      type="date"
                      value={dispatchEstimatedCompletion}
                      onChange={(e) => setDispatchEstimatedCompletion(e.target.value)}
                      required
                      style={{
                        padding: '8px 12px',
                        fontSize: '0.84rem',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        backgroundColor: '#ffffff',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Nút bấm thao tác */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setDispatchModalBus(null)}
                  style={{
                    padding: '8px 16px',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                  disabled={loadingDispatch}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 20px',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
                  }}
                  disabled={loadingDispatch}
                >
                  {loadingDispatch ? 'Đang cập nhật...' : 'Lưu cập nhật trạng thái'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default FleetForecastPage;
