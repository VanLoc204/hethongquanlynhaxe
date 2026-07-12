import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const API_BASE = 'http://localhost:8000/api/v1';

const OpsStaffPage = () => {
  const { token } = useContext(AuthContext);
  const [trips, setTrips] = useState([]);
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [availableAssistants, setAvailableAssistants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  
  // Modal state
  const [editingTrip, setEditingTrip] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedAssistant, setSelectedAssistant] = useState('');
  const [algoRunning, setAlgoRunning] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/trips/ops/trips`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setTrips(data.trips);
      }
    } catch {
      showToast('Không thể tải danh sách chuyến xe.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await fetch(`${API_BASE}/users/staff`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        // Filter drivers: role === 'driver' and status === 'active'
        const drivers = data.staff.filter(s => s.role === 'driver' && s.status === 'active');
        // Filter assistants: role === 'attendant' or 'assistant'
        const assistants = data.staff.filter(s => 
          (s.role === 'attendant' || s.role === 'assistant') && 
          s.status === 'active'
        );

        setAvailableDrivers(drivers.map(d => ({ name: d.name, phone: d.phone })));
        setAvailableAssistants(assistants.map(a => ({ name: a.name, phone: a.phone })));
      }
    } catch (err) {
      console.error('Lỗi lấy danh sách nhân viên:', err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchTrips();
      fetchStaff();
    }
  }, [token]);

  const handleOpenEdit = (trip) => {
    setEditingTrip(trip);
    // Find driver matching current trip
    const driverMatch = availableDrivers.find(d => d.name === trip.driver?.name) || '';
    const assistantMatch = availableAssistants.find(a => a.name === trip.assistant?.name) || '';
    setSelectedDriver(driverMatch ? JSON.stringify(driverMatch) : '');
    setSelectedAssistant(assistantMatch ? JSON.stringify(assistantMatch) : '');
  };

  const handleSaveAssignment = async (e) => {
    e.preventDefault();
    if (!editingTrip) return;

    const driverObj = selectedDriver ? JSON.parse(selectedDriver) : { name: '', phone: '' };
    const assistantObj = selectedAssistant ? JSON.parse(selectedAssistant) : { name: '', phone: '' };

    try {
      const res = await fetch(`${API_BASE}/trips/ops/trips/${editingTrip._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          driver: driverObj,
          assistant: assistantObj
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Cập nhật nhân sự chuyến xe thành công!');
        setEditingTrip(null);
        fetchTrips();
      } else {
        showToast(data.message || 'Lỗi cập nhật nhân sự.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    }
  };

  // Greedy scheduling algorithm:
  // Dynamically assigns driver & assistant to trips, ensuring no driver is assigned to overlapping times.
  const runGreedyAlgorithm = async () => {
    if (availableDrivers.length === 0) {
      showToast('Không có tài xế nào khả dụng trong hệ thống để phân công.', 'error');
      return;
    }

    setAlgoRunning(true);
    showToast('Bắt đầu tính toán phân công bằng thuật toán Greedy...', 'info');

    // Simulate scheduling delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Sort trips chronologically to apply Greedy scheduling
    const sortedTrips = [...trips].sort((a, b) => new Date(a.departureTime) - new Date(b.departureTime));
    
    // Track busy times for drivers and assistants: { [personPhone]: [ {start, end} ] }
    const busyDrivers = {};
    const busyAssistants = {};

    const updatedAssignments = [];

    for (const trip of sortedTrips) {
      const tripStart = new Date(trip.departureTime);
      const tripEnd = new Date(trip.arrivalTime);

      // Find first available driver
      let chosenDriver = null;
      for (const driver of availableDrivers) {
        const intervals = busyDrivers[driver.phone] || [];
        // Check overlap
        const isOverlap = intervals.some(interval => {
          return (tripStart < interval.end && tripEnd > interval.start);
        });
        if (!isOverlap) {
          chosenDriver = driver;
          // Book interval
          if (!busyDrivers[driver.phone]) busyDrivers[driver.phone] = [];
          busyDrivers[driver.phone].push({ start: tripStart, end: tripEnd });
          break;
        }
      }

      // Find first available assistant
      let chosenAssistant = null;
      for (const assistant of availableAssistants) {
        const intervals = busyAssistants[assistant.phone] || [];
        // Check overlap
        const isOverlap = intervals.some(interval => {
          return (tripStart < interval.end && tripEnd > interval.start);
        });
        if (!isOverlap) {
          chosenAssistant = assistant;
          // Book interval
          if (!busyAssistants[assistant.phone]) busyAssistants[assistant.phone] = [];
          busyAssistants[assistant.phone].push({ start: tripStart, end: tripEnd });
          break;
        }
      }

      // If we found both, queue the update
      if (chosenDriver || chosenAssistant) {
        updatedAssignments.push({
          tripId: trip._id,
          driver: chosenDriver || { name: '', phone: '' },
          assistant: chosenAssistant || { name: '', phone: '' }
        });
      }
    }

    // Save assignments to MongoDB
    try {
      let successCount = 0;
      for (const update of updatedAssignments) {
        const res = await fetch(`${API_BASE}/trips/ops/trips/${update.tripId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            driver: update.driver,
            assistant: update.assistant
          })
        });
        const data = await res.json();
        if (data.success) successCount++;
      }

      showToast(`Đã tự động phân công thành công ${successCount}/${sortedTrips.length} chuyến xe bằng thuật toán Greedy!`);
      fetchTrips();
    } catch {
      showToast('Lỗi lưu kết quả phân công vào cơ sở dữ liệu.', 'error');
    } finally {
      setAlgoRunning(false);
    }
  };

  return (
    <section className="panel" style={{ minHeight: '400px' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '80px', right: '20px', zIndex: 9999,
          background: toast.type === 'error' ? '#ef4444' : toast.type === 'info' ? '#3b82f6' : '#10b981',
          color: 'white', padding: '12px 20px', borderRadius: '8px',
          fontWeight: '600', boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
        }}>
          {toast.msg}
        </div>
      )}

      {/* Top Banner / Actions */}
      <div 
        style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '24px',
          padding: '16px',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)'
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Quản lý nhân sự chuyến</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
            Điều động, phân công Tài xế và Phụ xe cho các chuyến xe đang hoạt động.
          </p>
        </div>
        <div>
          <button 
            onClick={runGreedyAlgorithm} 
            disabled={algoRunning || trips.length === 0}
            className="btn btn-primary"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              fontWeight: '600', 
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)' 
            }}
          >
            {algoRunning ? 'Đang chạy thuật toán...' : '⚡ Phân công tự động (Greedy)'}
          </button>
        </div>
      </div>

      {/* Trips list with Staff Info */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Đang tải thông tin chuyến xe...
        </div>
      ) : trips.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Chưa có chuyến xe nào để phân công. Vui lòng tạo chuyến xe trước.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                <th style={{ padding: '12px' }}>Chuyến xe</th>
                <th style={{ padding: '12px' }}>Giờ xuất phát</th>
                <th style={{ padding: '12px' }}>Xe khách</th>
                <th style={{ padding: '12px' }}>Tài xế chính</th>
                <th style={{ padding: '12px' }}>Phụ xe</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Trạng thái</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {trips.map((trip) => {
                const depDate = new Date(trip.departureTime);
                const hasStaff = trip.driver?.name && trip.assistant?.name;
                
                return (
                  <tr key={trip._id} style={{ borderBottom: '1px solid var(--border-color)', verticalAlign: 'middle' }}>
                    <td style={{ padding: '16px 12px' }}>
                      <div style={{ fontWeight: '700', color: 'var(--primary)' }}>
                        {trip.routeId ? `${trip.routeId.startPoint} → ${trip.routeId.endPoint}` : 'N/A'}
                      </div>
                    </td>
                    <td style={{ padding: '16px 12px', fontSize: '0.9rem' }}>
                      {depDate.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td style={{ padding: '16px 12px', fontSize: '0.9rem', fontWeight: '600' }}>
                      {trip.busId?.plateNumber || 'N/A'}
                    </td>
                    <td style={{ padding: '16px 12px' }}>
                      {trip.driver?.name ? (
                        <div>
                          <div style={{ fontWeight: '600' }}>{trip.driver.name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{trip.driver.phone}</div>
                        </div>
                      ) : (
                        <span style={{ color: '#ef4444', fontStyle: 'italic', fontSize: '0.85rem' }}>Chưa có tài xế</span>
                      )}
                    </td>
                    <td style={{ padding: '16px 12px' }}>
                      {trip.assistant?.name ? (
                        <div>
                          <div style={{ fontWeight: '600' }}>{trip.assistant.name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{trip.assistant.phone}</div>
                        </div>
                      ) : (
                        <span style={{ color: '#ef4444', fontStyle: 'italic', fontSize: '0.85rem' }}>Chưa có phụ xe</span>
                      )}
                    </td>
                    <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                      <span 
                        style={{ 
                          padding: '4px 10px', 
                          borderRadius: '12px', 
                          fontSize: '0.75rem', 
                          fontWeight: '700',
                          backgroundColor: hasStaff ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: hasStaff ? '#10b981' : '#ef4444',
                          border: hasStaff ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)'
                        }}
                      >
                        {hasStaff ? 'Đã bố trí' : 'Thiếu nhân sự'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 12px', textAlign: 'right' }}>
                      <button 
                        onClick={() => handleOpenEdit(trip)} 
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                      >
                        Điều động
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Manual Assignment Modal */}
      {editingTrip && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="panel" style={{ width: '100%', maxWidth: '450px', padding: '24px', position: 'relative' }}>
            <h3 style={{ marginBottom: '8px' }}>Điều động nhân sự</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Chuyến: <strong style={{ color: 'var(--primary)' }}>{editingTrip.routeId ? `${editingTrip.routeId.startPoint} → ${editingTrip.routeId.endPoint}` : 'N/A'}</strong>
              <br />
              Khởi hành: {new Date(editingTrip.departureTime).toLocaleString('vi-VN')}
            </p>

            <form onSubmit={handleSaveAssignment}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Chọn tài xế chính</label>
                {availableDrivers.length === 0 ? (
                  <p style={{ color: '#ef4444', fontSize: '0.85rem', fontStyle: 'italic' }}>
                    Không có tài xế nào trong hệ thống. Vui lòng tạo tài xế trước.
                  </p>
                ) : (
                  <select 
                    className="form-control" 
                    value={selectedDriver}
                    onChange={(e) => setSelectedDriver(e.target.value)}
                  >
                    <option value="">-- Bỏ trống / Chưa phân công --</option>
                    {availableDrivers.map((driver, idx) => (
                      <option key={idx} value={JSON.stringify(driver)}>
                        {driver.name} ({driver.phone})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">Chọn phụ xe</label>
                {availableAssistants.length === 0 ? (
                  <p style={{ color: '#ef4444', fontSize: '0.85rem', fontStyle: 'italic' }}>
                    Không có phụ xe/nhân viên bán vé nào trong hệ thống. Vui lòng tạo trước.
                  </p>
                ) : (
                  <select 
                    className="form-control" 
                    value={selectedAssistant}
                    onChange={(e) => setSelectedAssistant(e.target.value)}
                  >
                    <option value="">-- Bỏ trống / Chưa phân công --</option>
                    {availableAssistants.map((assistant, idx) => (
                      <option key={idx} value={JSON.stringify(assistant)}>
                        {assistant.name} ({assistant.phone})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setEditingTrip(null)} className="btn btn-secondary">
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={availableDrivers.length === 0}>
                  Xác nhận điều động
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default OpsStaffPage;
