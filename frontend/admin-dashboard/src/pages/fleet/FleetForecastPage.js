import React, { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from '../../context/AuthContext';

const API_BASE = 'http://localhost:8000/api/v1';

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

  const [buses, setBuses] = useState([]);
  const [trips, setTrips] = useState([]);
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
  const [loadingDispatch, setLoadingDispatch] = useState(false);

  // Fetch real data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [resBuses, resTrips] = await Promise.all([
        fetch(`${API_BASE}/trips/fleet/buses`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE}/trips/ops/trips`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const dataBuses = await resBuses.json();
      const dataTrips = await resTrips.json();

      let busList = [];
      if (resBuses.ok && dataBuses.success) {
        busList = (dataBuses.buses || []).filter(b => b.status === 'approved');
        setBuses(busList);
        if (busList.length > 0 && !selectedBusId) {
          setSelectedBusId(busList[0]._id);
        }
      }

      if (resTrips.ok && dataTrips.success) {
        setTrips(dataTrips.trips || []);
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

  // Compute analytics for each bus
  const fleetAnalytics = useMemo(() => {
    return buses.map(bus => {
      // Find trips for this bus
      const busTrips = trips.filter(t => t.busId && (t.busId._id === bus._id || t.busId === bus._id));
      const tripCount = busTrips.length;

      // Calculate total km from trips
      let totalKm = 0;
      busTrips.forEach(t => {
        const distStr = t.routeId?.distance || '';
        const match = distStr.match(/(\d+)/);
        const km = match ? parseInt(match[1], 10) : 250;
        totalKm += km;
      });

      // Default reasonable baseline if brand new or 0 trips
      if (totalKm === 0) {
        totalKm = 32000;
      }

      // Calculate wear for 5 components
      const oilKmSince = totalKm % COMPONENT_THRESHOLDS.oil.cycleKm;
      const oilWear = Math.min(100, Math.round((oilKmSince / COMPONENT_THRESHOLDS.oil.cycleKm) * 100));
      const oilRemainKm = Math.max(0, COMPONENT_THRESHOLDS.oil.cycleKm - oilKmSince);

      const brakeKmSince = totalKm % COMPONENT_THRESHOLDS.brakes.cycleKm;
      const brakeWear = Math.min(100, Math.round((brakeKmSince / COMPONENT_THRESHOLDS.brakes.cycleKm) * 100));
      const brakeRemainKm = Math.max(0, COMPONENT_THRESHOLDS.brakes.cycleKm - brakeKmSince);

      const tireKmSince = totalKm % COMPONENT_THRESHOLDS.tires.cycleKm;
      const tireWear = Math.min(100, Math.round((tireKmSince / COMPONENT_THRESHOLDS.tires.cycleKm) * 100));
      const tireRemainKm = Math.max(0, COMPONENT_THRESHOLDS.tires.cycleKm - tireKmSince);

      const coolKmSince = totalKm % COMPONENT_THRESHOLDS.cooling.cycleKm;
      const coolWear = Math.min(100, Math.round((coolKmSince / COMPONENT_THRESHOLDS.cooling.cycleKm) * 100));
      const coolRemainKm = Math.max(0, COMPONENT_THRESHOLDS.cooling.cycleKm - coolKmSince);

      const battKmSince = totalKm % COMPONENT_THRESHOLDS.battery.cycleKm;
      const battWear = Math.min(100, Math.round((battKmSince / COMPONENT_THRESHOLDS.battery.cycleKm) * 100));
      const battRemainKm = Math.max(0, COMPONENT_THRESHOLDS.battery.cycleKm - battKmSince);

      const components = [
        { key: 'oil', ...COMPONENT_THRESHOLDS.oil, wear: oilWear, kmSince: oilKmSince, remainKm: oilRemainKm },
        { key: 'brakes', ...COMPONENT_THRESHOLDS.brakes, wear: brakeWear, kmSince: brakeKmSince, remainKm: brakeRemainKm },
        { key: 'tires', ...COMPONENT_THRESHOLDS.tires, wear: tireWear, kmSince: tireKmSince, remainKm: tireRemainKm },
        { key: 'cooling', ...COMPONENT_THRESHOLDS.cooling, wear: coolWear, kmSince: coolKmSince, remainKm: coolRemainKm },
        { key: 'battery', ...COMPONENT_THRESHOLDS.battery, wear: battWear, kmSince: battKmSince, remainKm: battRemainKm }
      ];

      // Highest wear component
      const highestWear = [...components].sort((a, b) => b.wear - a.wear)[0];

      // Overall health score: 100 minus weighted wear
      const avgWear = Math.round(components.reduce((sum, c) => sum + c.wear, 0) / components.length);
      const healthScore = Math.max(40, Math.round(100 - (highestWear.wear * 0.55 + avgWear * 0.45)));

      // Risk category
      let riskLevel = 'good'; // 'high' | 'medium' | 'good'
      let riskLabel = 'Vận hành tối ưu';
      if (highestWear.wear >= 85 || healthScore < 60) {
        riskLevel = 'high';
        riskLabel = 'Ưu tiên bảo dưỡng';
      } else if (highestWear.wear >= 70 || healthScore < 75) {
        riskLevel = 'medium';
        riskLabel = 'Cần theo dõi';
      }

      // Predicted days until next service (average 260 km/day)
      const daysUntil = Math.max(1, Math.round(highestWear.remainKm / 260));
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + daysUntil);

      // Estimated cost of upcoming maintenance
      const dueComponents = components.filter(c => c.wear >= 70);
      const predictedCost = dueComponents.length > 0
        ? dueComponents.reduce((sum, c) => sum + c.baseCost, 0)
        : highestWear.baseCost;

      // Recommended action
      let recommendation = 'Phương tiện đạt chuẩn kỹ thuật, tiếp tục vận hành theo lịch trình.';
      if (highestWear.wear >= 85) {
        recommendation = `Cần lập lịch thay thế ${highestWear.name.toLowerCase()} trước hành trình tiếp theo để bảo đảm an toàn.`;
      } else if (highestWear.wear >= 70) {
        recommendation = `Theo dõi sát ${highestWear.name.toLowerCase()} trong các đợt kiểm tra cuối ngày, còn khoảng ${highestWear.remainKm.toLocaleString('vi-VN')} km.`;
      }

      return {
        bus,
        tripCount,
        totalKm,
        components,
        highestWear,
        healthScore,
        riskLevel,
        riskLabel,
        daysUntil,
        nextDate,
        predictedCost,
        recommendation
      };
    });
  }, [buses, trips]);

  // Overall fleet KPIs
  const totalFleetKm = useMemo(() => {
    return fleetAnalytics.reduce((sum, a) => sum + a.totalKm, 0);
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
    setDispatchDescription(`Bảo dưỡng dự phòng kỹ thuật: ${item.highestWear.name} (Hao mòn ${item.highestWear.wear}%)`);
    setDispatchEstimatedCost(item.predictedCost);
  };

  // Confirm Dispatch to Maintenance
  const handleConfirmDispatch = async (e) => {
    e.preventDefault();
    if (!dispatchModalBus) return;

    setLoadingDispatch(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const busId = dispatchModalBus.bus._id;
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
            estimatedCompletion: dispatchModalBus.nextDate,
            estimatedCost: Number(dispatchEstimatedCost) || 0
          }
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(`Đã chuyển xe ${dispatchModalBus.bus.plateNumber} vào diện bảo dưỡng kỹ thuật thành công.`);
        setDispatchModalBus(null);
        fetchData();
      } else {
        setErrorMsg(data.message || 'Lỗi khi cập nhật trạng thái bảo dưỡng.');
      }
    } catch (err) {
      setErrorMsg('Lỗi kết nối máy chủ khi chuyển bảo dưỡng.');
    } finally {
      setLoadingDispatch(false);
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
            Phân tích mức độ hao mòn các cụm chi tiết máy theo chu kỳ km vận hành thực tế của toàn bộ 5 phương tiện.
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
            {trips.length} chuyến thực hiện
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
                    Sức chứa: {selectedBusAnalytics.bus.totalSeats} chỗ • Tổng tích lũy: {selectedBusAnalytics.totalKm.toLocaleString('vi-VN')} km ({selectedBusAnalytics.tripCount} chuyến)
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
                      {item.totalKm.toLocaleString('vi-VN')} km ({item.tripCount} chuyến)
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
            maxWidth: '460px',
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
                  Lập Lệnh Bảo Dưỡng Dự Phòng
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

            <form onSubmit={handleConfirmDispatch} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.76rem', fontWeight: '700', color: '#334155' }}>
                  Garage Tiếp Nhận Kỹ Thuật *
                </label>
                <input
                  type="text"
                  value={dispatchGarage}
                  onChange={(e) => setDispatchGarage(e.target.value)}
                  required
                  style={{
                    padding: '8px 10px',
                    fontSize: '0.85rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.76rem', fontWeight: '700', color: '#334155' }}>
                  Dự Toán Ngân Sách Dự Kiến (VNĐ)
                </label>
                <input
                  type="number"
                  value={dispatchEstimatedCost}
                  onChange={(e) => setDispatchEstimatedCost(e.target.value)}
                  min="0"
                  style={{
                    padding: '8px 10px',
                    fontSize: '0.85rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.76rem', fontWeight: '700', color: '#334155' }}>
                  Nội Dung & Hạng Mục Cần Bảo Trì *
                </label>
                <textarea
                  rows="3"
                  value={dispatchDescription}
                  onChange={(e) => setDispatchDescription(e.target.value)}
                  required
                  style={{
                    padding: '8px 10px',
                    fontSize: '0.85rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    outline: 'none',
                    resize: 'none'
                  }}
                />
              </div>

              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '8px 10px',
                fontSize: '0.72rem',
                color: '#475569'
              }}>
                Hệ thống sẽ chuyển trạng thái xe sang <strong>Đang bảo dưỡng</strong> và cập nhật thông số vào sổ theo dõi kỹ thuật.
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setDispatchModalBus(null)}
                  style={{
                    padding: '7px 14px',
                    fontSize: '0.78rem',
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
                    padding: '7px 16px',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: '#0f172a',
                    color: '#ffffff',
                    cursor: 'pointer'
                  }}
                  disabled={loadingDispatch}
                >
                  {loadingDispatch ? 'Đang xử lý...' : 'Xác Nhận Đưa Vào Xưởng'}
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
