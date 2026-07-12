import React, { useState, useEffect } from 'react';

const AVAILABLE_AMENITIES = [
  'Tivi LED', 'Toilet', 'Sạc điện thoại', 'Đèn đọc sách', 'Rèm cửa',
  'Chăn đắp', 'Wifi', 'Nước uống', 'Điều hòa', 'Khăn lạnh', 'Gối nằm', 'Búa phá kính'
];

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80';

// Generate dynamic templates for bus layouts based on passenger count and type
const generateDefaultSeatLayout = (totalSeats, busType = '') => {
  const lowerFloor = [];
  const upperFloor = [];
  const typeStr = (busType || '').toLowerCase();

  const isDoubleDecker = 
    typeStr.includes('giường') || 
    typeStr.includes('phòng') || 
    typeStr.includes('cabin') || 
    totalSeats === 20 || 
    totalSeats === 22 || 
    totalSeats === 24 || 
    totalSeats === 32 || 
    totalSeats === 34 || 
    totalSeats === 40 || 
    totalSeats === 44;

  if (isDoubleDecker) {
    if (totalSeats === 20 || totalSeats === 22 || totalSeats === 24) {
      if (totalSeats === 20) {
        lowerFloor.push(['A1', null, null]);
        lowerFloor.push(['A2', null, 'A3']);
        lowerFloor.push(['A4', null, 'A5']);
        lowerFloor.push(['A6', null, 'A7']);
        lowerFloor.push(['A8', 'A9', 'A10']);

        upperFloor.push(['B1', null, null]);
        upperFloor.push(['B2', null, 'B3']);
        upperFloor.push(['B4', null, 'B5']);
        upperFloor.push(['B6', null, 'B7']);
        upperFloor.push(['B8', 'B9', 'B10']);
      } else if (totalSeats === 22) {
        lowerFloor.push(['A1', null, 'A2']);
        lowerFloor.push(['A3', null, 'A4']);
        lowerFloor.push(['A5', null, 'A6']);
        lowerFloor.push(['A7', null, 'A8']);
        lowerFloor.push(['A9', 'A10', 'A11']);

        upperFloor.push(['B1', null, 'B2']);
        upperFloor.push(['B3', null, 'B4']);
        upperFloor.push(['B5', null, 'B6']);
        upperFloor.push(['B7', null, 'B8']);
        upperFloor.push(['B9', 'B10', 'B11']);
      } else if (totalSeats === 24) {
        lowerFloor.push(['A1', null, null]);
        lowerFloor.push(['A2', null, 'A3']);
        lowerFloor.push(['A4', null, 'A5']);
        lowerFloor.push(['A6', null, 'A7']);
        lowerFloor.push(['A8', null, 'A9']);
        lowerFloor.push(['A10', 'A11', 'A12']);

        upperFloor.push(['B1', null, null]);
        upperFloor.push(['B2', null, 'B3']);
        upperFloor.push(['B4', null, 'B5']);
        upperFloor.push(['B6', null, 'B7']);
        upperFloor.push(['B8', null, 'B9']);
        upperFloor.push(['B10', 'B11', 'B12']);
      }
      return { lowerFloor, upperFloor, columns: 3 };
    }

    if (totalSeats === 32 || totalSeats === 34 || totalSeats === 40 || totalSeats === 44) {
      if (totalSeats === 32) {
        lowerFloor.push(['A1', null, null, null, 'A2']);
        lowerFloor.push(['A3', null, 'A4', null, 'A5']);
        lowerFloor.push(['A6', null, 'A7', null, 'A8']);
        lowerFloor.push(['A9', null, 'A10', null, 'A11']);
        lowerFloor.push(['A12', 'A13', 'A14', 'A15', 'A16']);

        upperFloor.push(['B1', null, null, null, 'B2']);
        upperFloor.push(['B3', null, 'B4', null, 'B5']);
        upperFloor.push(['B6', null, 'B7', null, 'B8']);
        upperFloor.push(['B9', null, 'B10', null, 'B11']);
        upperFloor.push(['B12', 'B13', 'B14', 'B15', 'B16']);
      } else if (totalSeats === 34) {
        lowerFloor.push(['A1', null, 'A2', null, 'A3']);
        lowerFloor.push(['A4', null, 'A5', null, 'A6']);
        lowerFloor.push(['A7', null, 'A8', null, 'A9']);
        lowerFloor.push(['A10', null, 'A11', null, 'A12']);
        lowerFloor.push(['A13', 'A14', 'A15', 'A16', 'A17']);

        upperFloor.push(['B1', null, 'B2', null, 'B3']);
        upperFloor.push(['B4', null, 'B5', null, 'B6']);
        upperFloor.push(['B7', null, 'B8', null, 'B9']);
        upperFloor.push(['B10', null, 'B11', null, 'B12']);
        upperFloor.push(['B13', 'B14', 'B15', 'B16', 'B17']);
      } else if (totalSeats === 40) {
        lowerFloor.push(['A1', null, 'A2', null, 'A3']);
        lowerFloor.push(['A4', null, 'A5', null, 'A6']);
        lowerFloor.push(['A7', null, 'A8', null, 'A9']);
        lowerFloor.push(['A10', null, 'A11', null, 'A12']);
        lowerFloor.push(['A13', null, 'A14', null, 'A15']);
        lowerFloor.push(['A16', 'A17', 'A18', 'A19', 'A20']);

        upperFloor.push(['B1', null, 'B2', null, 'B3']);
        upperFloor.push(['B4', null, 'B5', null, 'B6']);
        upperFloor.push(['B7', null, 'B8', null, 'B9']);
        upperFloor.push(['B10', null, 'B11', null, 'B12']);
        upperFloor.push(['B13', null, 'B14', null, 'B15']);
        upperFloor.push(['B16', 'B17', 'B18', 'B19', 'B20']);
      } else if (totalSeats === 44) {
        lowerFloor.push(['A1', null, null, null, 'A2']);
        lowerFloor.push(['A3', null, 'A4', null, 'A5']);
        lowerFloor.push(['A6', null, 'A7', null, 'A8']);
        lowerFloor.push(['A9', null, 'A10', null, 'A11']);
        lowerFloor.push(['A12', null, 'A13', null, 'A14']);
        lowerFloor.push(['A15', null, 'A16', null, 'A17']);
        lowerFloor.push(['A18', 'A19', 'A20', 'A21', 'A22']);

        upperFloor.push(['B1', null, null, null, 'B2']);
        upperFloor.push(['B3', null, 'B4', null, 'B5']);
        upperFloor.push(['B6', null, 'B7', null, 'B8']);
        upperFloor.push(['B9', null, 'B10', null, 'B11']);
        upperFloor.push(['B12', null, 'B13', null, 'B14']);
        upperFloor.push(['B15', null, 'B16', null, 'B17']);
        upperFloor.push(['B18', 'B19', 'B20', 'B21', 'B22']);
      }
      return { lowerFloor, upperFloor, columns: 5 };
    }
  }

  // 1 Floor Vehicles
  if (totalSeats === 9) {
    lowerFloor.push(['A1', null, 'A2']);
    lowerFloor.push(['A3', null, 'A4']);
    lowerFloor.push(['A5', null, 'A6']);
    lowerFloor.push(['A7', 'A8', 'A9']);
    return { lowerFloor, upperFloor: [], columns: 3 };
  }

  if (totalSeats === 19) {
    lowerFloor.push(['A1', null, 'A2']);
    lowerFloor.push(['A3', null, 'A4']);
    lowerFloor.push(['A5', null, 'A6']);
    lowerFloor.push(['A7', null, 'A8']);
    lowerFloor.push(['A9', null, 'A10']);
    lowerFloor.push(['A11', null, 'A12']);
    lowerFloor.push(['A13', null, 'A14']);
    lowerFloor.push(['A15', null, 'A16']);
    lowerFloor.push(['A17', 'A18', 'A19']);
    return { lowerFloor, upperFloor: [], columns: 3 };
  }

  if (totalSeats === 16) {
    lowerFloor.push(['A1', 'A2', null, 'A3']);
    lowerFloor.push(['A4', 'A5', null, 'A6']);
    lowerFloor.push(['A7', 'A8', null, 'A9']);
    lowerFloor.push(['A10', 'A11', null, 'A12']);
    lowerFloor.push(['A13', 'A14', 'A15', 'A16']);
    return { lowerFloor, upperFloor: [], columns: 4 };
  }

  if (totalSeats === 29) {
    lowerFloor.push(['A1', 'A2', null, 'A3', 'A4']);
    lowerFloor.push(['A5', 'A6', null, 'A7', 'A8']);
    lowerFloor.push(['A9', 'A10', null, 'A11', 'A12']);
    lowerFloor.push(['A13', 'A14', null, 'A15', 'A16']);
    lowerFloor.push(['A17', 'A18', null, 'A19', 'A20']);
    lowerFloor.push(['A21', 'A22', null, 'A23', 'A24']);
    lowerFloor.push(['A25', 'A26', 'A27', 'A28', 'A29']);
    return { lowerFloor, upperFloor: [], columns: 5 };
  }

  if (totalSeats === 35) {
    lowerFloor.push([null, null, null, 'A1', 'A2']);
    lowerFloor.push(['A3', 'A4', null, 'A5', 'A6']);
    lowerFloor.push(['A7', 'A8', null, 'A9', 'A10']);
    lowerFloor.push(['A11', 'A12', null, 'A13', 'A14']);
    lowerFloor.push(['A15', 'A16', null, 'A17', 'A18']);
    lowerFloor.push(['A19', 'A20', null, 'A21', 'A22']);
    lowerFloor.push(['A23', 'A24', null, 'A25', 'A26']);
    lowerFloor.push(['A27', 'A28', null, 'A29', 'A30']);
    lowerFloor.push(['A31', 'A32', 'A33', 'A34', 'A35']);
    return { lowerFloor, upperFloor: [], columns: 5 };
  }

  if (totalSeats === 45) {
    lowerFloor.push(['A1', 'A2', null, 'A3', 'A4']);
    lowerFloor.push(['A5', 'A6', null, 'A7', 'A8']);
    lowerFloor.push(['A9', 'A10', null, 'A11', 'A12']);
    lowerFloor.push(['A13', 'A14', null, 'A15', 'A16']);
    lowerFloor.push(['A17', 'A18', null, 'A19', 'A20']);
    lowerFloor.push(['A21', 'A22', null, 'A23', 'A24']);
    lowerFloor.push(['A25', 'A26', null, 'A27', 'A28']);
    lowerFloor.push(['A29', 'A30', null, 'A31', 'A32']);
    lowerFloor.push(['A33', 'A34', null, 'A35', 'A36']);
    lowerFloor.push(['A37', 'A38', null, 'A39', 'A40']);
    lowerFloor.push(['A41', 'A42', 'A43', 'A44', 'A45']);
    return { lowerFloor, upperFloor: [], columns: 5 };
  }

  if (totalSeats === 47) {
    lowerFloor.push([null, null, null, 'A1', 'A2']);
    lowerFloor.push(['A3', 'A4', null, 'A5', 'A6']);
    lowerFloor.push(['A7', 'A8', null, 'A9', 'A10']);
    lowerFloor.push(['A11', 'A12', null, 'A13', 'A14']);
    lowerFloor.push(['A15', 'A16', null, 'A17', 'A18']);
    lowerFloor.push(['A19', 'A20', null, 'A21', 'A22']);
    lowerFloor.push(['A23', 'A24', null, 'A25', 'A26']);
    lowerFloor.push(['A27', 'A28', null, 'A29', 'A30']);
    lowerFloor.push(['A31', 'A32', null, 'A33', 'A34']);
    lowerFloor.push(['A35', 'A36', null, 'A37', 'A38']);
    lowerFloor.push(['A39', 'A40', null, 'A41', 'A42']);
    lowerFloor.push(['A43', 'A44', 'A45', 'A46', 'A47']);
    return { lowerFloor, upperFloor: [], columns: 5 };
  }

  // fallback general generator
  const fallbackLower = [];
  const rowsCount = Math.ceil(totalSeats / 4);
  for (let r = 1; r <= rowsCount; r++) {
    const idx = (r - 1) * 4;
    fallbackLower.push([`A${idx + 1}`, `A${idx + 2}`, null, `A${idx + 3}`, `A${idx + 4}`]);
  }
  return { lowerFloor: fallbackLower, upperFloor: [], columns: 5 };
};

const BusModal = ({ bus, token, onClose, onSaved }) => {
  const isEdit = !!bus;
  const [plateNumber, setPlateNumber] = useState(bus?.plateNumber || '');
  const [busType, setBusType] = useState(bus?.type || 'Limousine 22 Phòng (WC)');
  const [totalSeats, setTotalSeats] = useState(bus?.totalSeats || 22);
  const [imageUrl, setImageUrl] = useState(bus?.images?.[0] || '');
  const [amenities, setAmenities] = useState(bus?.amenities || ['Wifi', 'Nước uống', 'Điều hòa', 'Khăn lạnh']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Interactive Seat Layout states
  const initialLayout = bus?.seatLayout || generateDefaultSeatLayout(bus?.totalSeats || 22, bus?.type || 'Limousine 22 Phòng (WC)');
  const [columns, setColumns] = useState(initialLayout.columns || 5);
  const [lowerFloor, setLowerFloor] = useState(initialLayout.lowerFloor || []);
  const [upperFloor, setUpperFloor] = useState(initialLayout.upperFloor || []);
  const [activeFloor, setActiveFloor] = useState('lower');

  const API_BASE = 'http://localhost:8000/api/v1';

  // Keep totalSeats in sync with non-null grid cells
  useEffect(() => {
    const countLower = lowerFloor.flat().filter(c => c !== null && c.trim() !== '').length;
    const countUpper = upperFloor.flat().filter(c => c !== null && c.trim() !== '').length;
    setTotalSeats(countLower + countUpper);
  }, [lowerFloor, upperFloor]);

  const toggleAmenity = (am) =>
    setAmenities(prev => prev.includes(am) ? prev.filter(a => a !== am) : [...prev, am]);

  // Toggle visual cell between spacer and seat
  const toggleCell = (rowIndex, colIndex) => {
    const currentGrid = activeFloor === 'lower' ? lowerFloor : upperFloor;
    const setGrid = activeFloor === 'lower' ? setLowerFloor : setUpperFloor;

    const nextGrid = currentGrid.map((row, rIdx) => {
      if (rIdx !== rowIndex) return row;
      return row.map((cell, cIdx) => {
        if (cIdx !== colIndex) return cell;
        if (cell === null) {
          // Count active seats on this floor to calculate next ID prefix
          const seatCount = currentGrid.flat().filter(c => c !== null).length;
          const prefix = activeFloor === 'lower' ? 'A' : 'B';
          return `${prefix}${seatCount + 1}`;
        } else {
          return null;
        }
      });
    });
    setGrid(nextGrid);
  };

  // Change individual seat label
  const updateSeatLabel = (rowIndex, colIndex, newLabel) => {
    const currentGrid = activeFloor === 'lower' ? lowerFloor : upperFloor;
    const setGrid = activeFloor === 'lower' ? setLowerFloor : setUpperFloor;

    const nextGrid = currentGrid.map((row, rIdx) => {
      if (rIdx !== rowIndex) return row;
      return row.map((cell, cIdx) => {
        if (cIdx !== colIndex) return cell;
        return newLabel;
      });
    });
    setGrid(nextGrid);
  };

  // Resize columns count
  const handleColumnsChange = (newCols) => {
    const val = Number(newCols);
    if (val < 2 || val > 10) return;
    setColumns(val);

    const resizeGrid = (grid) => {
      return grid.map(row => {
        if (row.length === val) return row;
        if (row.length < val) {
          return [...row, ...Array(val - row.length).fill(null)];
        } else {
          return row.slice(0, val);
        }
      });
    };

    setLowerFloor(resizeGrid(lowerFloor));
    if (upperFloor && upperFloor.length > 0) {
      setUpperFloor(resizeGrid(upperFloor));
    }
  };

  const addRow = () => {
    const newRow = Array(columns).fill(null);
    if (activeFloor === 'lower') {
      setLowerFloor([...lowerFloor, newRow]);
    } else {
      setUpperFloor([...upperFloor, newRow]);
    }
  };

  const removeRow = () => {
    if (activeFloor === 'lower') {
      if (lowerFloor.length > 1) {
        setLowerFloor(lowerFloor.slice(0, -1));
      }
    } else {
      if (upperFloor.length > 1) {
        setUpperFloor(upperFloor.slice(0, -1));
      }
    }
  };

  const resetToDefaultTemplate = () => {
    if (window.confirm('Cảnh báo: Sơ đồ ghế hiện tại sẽ bị ghi đè bằng mẫu chuẩn của loại xe này. Tiếp tục?')) {
      const match = busType.match(/\d+/);
      const seatsVal = match ? Number(match[0]) : 22;
      const template = generateDefaultSeatLayout(seatsVal, busType);
      setColumns(template.columns);
      setLowerFloor(template.lowerFloor);
      setUpperFloor(template.upperFloor);
      setActiveFloor('lower');
    }
  };

  // Toggle second deck configuration
  const toggleDoubleDecker = () => {
    if (upperFloor && upperFloor.length > 0) {
      if (window.confirm('Bạn có chắc muốn xóa Tầng 2? Mọi ghế đã đặt trên tầng này sẽ mất.')) {
        setUpperFloor([]);
        setActiveFloor('lower');
      }
    } else {
      const newUpper = lowerFloor.map((row, rIdx) => 
        row.map((cell, cIdx) => cell ? `B${rIdx * columns + cIdx + 1}` : null)
      );
      setUpperFloor(newUpper);
      setActiveFloor('upper');
    }
  };

  const handleBusTypeChange = (newType) => {
    setBusType(newType);
    const match = newType.match(/\d+/);
    if (match) {
      const seatsVal = Number(match[0]);
      setTotalSeats(seatsVal);
      const template = generateDefaultSeatLayout(seatsVal, newType);
      setColumns(template.columns);
      setLowerFloor(template.lowerFloor);
      setUpperFloor(template.upperFloor);
      setActiveFloor('lower');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!plateNumber || !busType || !totalSeats) {
      setError('Vui lòng nhập đầy đủ Biển số, Loại xe.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = {
        plateNumber: plateNumber.trim(),
        type: busType,
        totalSeats: Number(totalSeats),
        amenities,
        images: imageUrl.trim() ? [imageUrl.trim()] : [DEFAULT_IMAGE],
        seatLayout: {
          columns: Number(columns),
          lowerFloor,
          upperFloor: (upperFloor && upperFloor.length > 0) ? upperFloor : []
        }
      };

      const url = isEdit
        ? `${API_BASE}/trips/fleet/buses/${bus._id}`
        : `${API_BASE}/trips/fleet/buses`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        onSaved();
      } else {
        setError(data.message || 'Lỗi khi lưu phương tiện.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '880px', width: '95%' }}>
        <div className="modal-header">
          <h2>{isEdit ? `Chỉnh sửa phương tiện: ${bus.plateNumber}` : 'Thêm phương tiện mới'}</h2>
          <button onClick={onClose} className="modal-close">&times;</button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '2rem', maxHeight: '72vh', overflowY: 'auto' }}>
            
            {/* Left Column: Form Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label>Biển số xe</label>
                <input className="form-control" placeholder="VD: 49B-999.99" value={plateNumber}
                  onChange={e => setPlateNumber(e.target.value)} required />
              </div>

              <div className="form-group">
                <label>Loại xe</label>
                <select className="form-control" value={busType} onChange={e => handleBusTypeChange(e.target.value)}>
                  <option value="" disabled>-- Chọn loại xe & số ghế --</option>
                  <optgroup label="Xe Khách Ghế Ngồi">
                    <option value="Xe Ghế Ngồi 16 Chỗ">Xe Ghế Ngồi 16 Chỗ (Transit, Solati)</option>
                    <option value="Xe Ghế Ngồi 29 Chỗ">Xe Ghế Ngồi 29 Chỗ (County, Samco)</option>
                    <option value="Xe Ghế Ngồi 35 Chỗ">Xe Ghế Ngồi 35 Chỗ (Town, Samco)</option>
                    <option value="Xe Ghế Ngồi 45 Chỗ">Xe Ghế Ngồi 45 Chỗ (Universe)</option>
                    <option value="Xe Ghế Ngồi 47 Chỗ">Xe Ghế Ngồi 47 Chỗ (Bluesky)</option>
                  </optgroup>
                  <optgroup label="Xe Giường Nằm Truyền Thống">
                    <option value="Xe Giường Nằm 32 Chỗ">Xe Giường Nằm 32 Chỗ</option>
                    <option value="Xe Giường Nằm 34 Chỗ">Xe Giường Nằm 34 Chỗ</option>
                    <option value="Xe Giường Nằm 40 Chỗ">Xe Giường Nằm 40 Chỗ</option>
                    <option value="Xe Giường Nằm 44 Chỗ">Xe Giường Nằm 44 Chỗ</option>
                  </optgroup>
                  <optgroup label="Xe Giường Phòng Cabin VIP">
                    <option value="Limousine 20 Phòng (VIP)">Limousine 20 Phòng (VIP)</option>
                    <option value="Limousine 22 Phòng (WC)">Limousine 22 Phòng (WC)</option>
                    <option value="Limousine 24 Phòng (VIP)">Limousine 24 Phòng (VIP)</option>
                  </optgroup>
                  <optgroup label="Xe Limousine Ghế Ngồi">
                    <option value="Limousine Ghế Ngồi 9 Chỗ">Limousine Ghế Ngồi 9 Chỗ VIP</option>
                    <option value="Limousine Ghế Ngồi 19 Chỗ">Limousine Ghế Ngồi 19 Chỗ VIP</option>
                  </optgroup>
                </select>
              </div>

              <div className="form-group">
                <label>Tổng số ghế / giường (Tự động tính từ sơ đồ)</label>
                <input className="form-control" type="number" value={totalSeats} readOnly style={{ backgroundColor: 'rgba(255,255,255,0.05)', cursor: 'not-allowed' }} />
              </div>

              <div className="form-group">
                <label>URL hình ảnh (tùy chọn)</label>
                <input className="form-control" placeholder="Để trống dùng ảnh mặc định"
                  value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
              </div>

              <div className="form-group">
                <label>Tiện ích đi kèm</label>
                <div className="checkbox-group">
                  {AVAILABLE_AMENITIES.map(am => (
                    <label key={am} className="checkbox-item">
                      <input type="checkbox" checked={amenities.includes(am)}
                        onChange={() => toggleAmenity(am)} />
                      {am}
                    </label>
                  ))}
                </div>
              </div>

              {error && <p className="error-message">{error}</p>}
            </div>

            {/* Right Column: Visual Seat Map Builder */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingLeft: '1.5rem', borderLeft: '1px solid var(--card-border)' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.25rem', color: 'var(--primary)' }}>Thiết kế sơ đồ ghế</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Click vào ô để Bật/Tắt ghế. Sửa trực tiếp tên ghế trong ô bên dưới.</p>
              </div>

              {/* Grid Column Control */}
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                  <label style={{ fontSize: '0.8rem' }}>Số cột dọc</label>
                  <select 
                    className="form-control" 
                    value={columns} 
                    onChange={e => handleColumnsChange(e.target.value)}
                    style={{ padding: '0.4rem 0.6rem' }}
                  >
                    {[2, 3, 4, 5, 6].map(c => <option key={c} value={c}>{c} Cột</option>)}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                  <label style={{ fontSize: '0.8rem' }}>Số tầng xe</label>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={toggleDoubleDecker}
                    style={{ padding: '0.4rem 0.8rem', width: '100%', fontSize: '0.85rem' }}
                  >
                    {upperFloor && upperFloor.length > 0 ? 'Xóa Tầng 2' : 'Thêm Tầng 2'}
                  </button>
                </div>
              </div>

              {/* Floor selector if double decker */}
              {upperFloor && upperFloor.length > 0 && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    type="button" 
                    className={`btn ${activeFloor === 'lower' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveFloor('lower')}
                    style={{ flex: 1, padding: '0.45rem', fontSize: '0.85rem' }}
                  >
                    Tầng dưới (Tầng 1)
                  </button>
                  <button 
                    type="button" 
                    className={`btn ${activeFloor === 'upper' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveFloor('upper')}
                    style={{ flex: 1, padding: '0.45rem', fontSize: '0.85rem' }}
                  >
                    Tầng trên (Tầng 2)
                  </button>
                </div>
              )}

              {/* Interactive Bus Seat Designer Grid */}
              <div style={{ 
                border: '1px solid var(--card-border)', 
                borderRadius: '12px', 
                padding: '1.25rem', 
                backgroundColor: 'rgba(0,0,0,0.2)',
                maxHeight: '380px',
                overflowY: 'auto'
              }}>
                {/* Driver Steering wheel mock */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  borderBottom: '1px dashed var(--card-border)', 
                  paddingBottom: '0.5rem', 
                  marginBottom: '1rem',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)'
                }}>
                  <span>ĐẦU XE & TÀI XẾ</span>
                  <span style={{ fontSize: '1rem' }}>☸</span>
                </div>

                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: `repeat(${columns}, 1fr)`, 
                  gap: '8px' 
                }}>
                  {(activeFloor === 'lower' ? lowerFloor : upperFloor).map((row, rIdx) => 
                    row.map((cell, cIdx) => {
                      const isSeat = cell !== null;
                      return (
                        <div 
                          key={`${rIdx}-${cIdx}`} 
                          style={{
                            height: '52px',
                            borderRadius: '8px',
                            border: isSeat ? '2px solid var(--primary)' : '1px dashed rgba(255,255,255,0.15)',
                            backgroundColor: isSeat ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '3px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {isSeat ? (
                            <>
                              <input 
                                type="text"
                                value={cell}
                                onChange={e => updateSeatLabel(rIdx, cIdx, e.target.value)}
                                style={{
                                  width: '100%',
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--text-main)',
                                  textAlign: 'center',
                                  fontSize: '0.8rem',
                                  fontWeight: '700',
                                  outline: 'none'
                                }}
                              />
                              <button 
                                type="button"
                                onClick={() => toggleCell(rIdx, cIdx)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#ef4444',
                                  fontSize: '0.65rem',
                                  cursor: 'pointer',
                                  padding: 0,
                                  lineHeight: 1
                                }}
                              >
                                Xóa
                              </button>
                            </>
                          ) : (
                            <button 
                              type="button"
                              onClick={() => toggleCell(rIdx, cIdx)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'rgba(255,255,255,0.3)',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              +
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Row configuration tools */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={addRow} style={{ flex: 1, padding: '0.45rem', fontSize: '0.85rem' }}>
                  + Hàng
                </button>
                <button type="button" className="btn btn-secondary" onClick={removeRow} style={{ flex: 1, padding: '0.45rem', fontSize: '0.85rem' }}>
                  - Hàng
                </button>
                <button type="button" className="btn btn-secondary" onClick={resetToDefaultTemplate} style={{ padding: '0.45rem 0.8rem', fontSize: '0.85rem', color: 'var(--warning)' }}>
                  Mẫu chuẩn
                </button>
              </div>

            </div>

          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary">Hủy bỏ</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Đang lưu...' : 'Lưu lại'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BusModal;
