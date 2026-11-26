import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../config/api';

// Clean SVG Icon mapping matching mockup 2 perfectly with standard DB IDs & aliases
const ALL_AMENITIES = [
  { 
    id: 'Wifi', 
    label: 'Wifi tốc độ cao', 
    aliases: ['wifi'],
    svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg> 
  },
  { 
    id: 'Nước uống', 
    label: 'Nước uống', 
    aliases: ['nước'],
    svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/></svg> 
  },
  { 
    id: 'Điều hòa', 
    label: 'Điều hòa 2 chiều', 
    aliases: ['điều hòa', 'máy lạnh'],
    svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M2 12h20M12 2v20M20 16l-4-4 4-4M4 8l4 4-4 4M16 4l-4 4-4-4M8 20l4-4 4 4"/></svg> 
  },
  { 
    id: 'Khăn lạnh', 
    label: 'Khăn lạnh', 
    aliases: ['khăn'],
    svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07"/></svg> 
  },
  { 
    id: 'Gối nằm', 
    label: 'Gối nằm êm ái', 
    aliases: ['gối'],
    svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="3" y="6" width="18" height="12" rx="4"/><line x1="9" y1="6" x2="9" y2="18"/></svg> 
  },
  { 
    id: 'Chăn đắp', 
    label: 'Chăn đắp cao cấp', 
    aliases: ['chăn', 'mền'],
    svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/></svg> 
  },
  { 
    id: 'Sạc điện thoại', 
    label: 'Sạc điện thoại', 
    aliases: ['sạc'],
    svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> 
  },
  { 
    id: 'Tivi LED giải trí', 
    label: 'Tivi LED giải trí', 
    aliases: ['tivi', 'tv'],
    svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="2" y="7" width="20" height="13" rx="2"/><polyline points="17 2 12 7 7 2"/></svg> 
  },
  { 
    id: 'Nhà vệ sinh (WC)', 
    label: 'Nhà vệ sinh (WC)', 
    aliases: ['vệ sinh', 'wc'],
    svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M18 8l4 4-4 4"/></svg> 
  },
  { 
    id: 'Đèn đọc sách', 
    label: 'Đèn đọc sách', 
    aliases: ['đèn'],
    svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M9 18h6M10 22h4M12 2v1a7 7 0 0 0 7 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-1.26C6.19 14.47 5 12.38 5 10a7 7 0 0 1 7-7z"/></svg> 
  },
  { 
    id: 'Rèm che riêng tư', 
    label: 'Rèm che riêng tư', 
    aliases: ['rèm'],
    svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18"/></svg> 
  }
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

  // fallback general generator
  const fallbackLower = [];
  const rowsCount = Math.ceil(totalSeats / 4);
  for (let r = 1; r <= rowsCount; r++) {
    const idx = (r - 1) * 4;
    fallbackLower.push([`A${idx + 1}`, `A${idx + 2}`, null, `A${idx + 3}`, `A${idx + 4}`]);
  }
  return { lowerFloor: fallbackLower, upperFloor: [], columns: 5 };
};

const normalizeAmenity = (name) => {
  if (!name) return '';
  const trimmed = String(name).trim();
  for (const am of ALL_AMENITIES) {
    if (trimmed.toLowerCase() === am.id.toLowerCase()) return am.id;
    if (trimmed.toLowerCase() === am.label.toLowerCase()) return am.id;
    if (am.aliases && am.aliases.some(alias => trimmed.toLowerCase().includes(alias.toLowerCase()))) {
      return am.id;
    }
  }
  return trimmed;
};

const BusModal = ({ bus, token, onClose, onSaved }) => {
  const isEdit = !!bus;
  const [plateNumber, setPlateNumber] = useState(bus?.plateNumber || '');
  const [busType, setBusType] = useState(bus?.type || 'Xe Giường Nằm 44 Chỗ');
  const [totalSeats, setTotalSeats] = useState(bus?.totalSeats || 44);
  const [imageUrl, setImageUrl] = useState(bus?.images?.[0] || '');
  const [amenities, setAmenities] = useState(() => {
    if (bus?.amenities && Array.isArray(bus.amenities) && bus.amenities.length > 0) {
      return Array.from(new Set(bus.amenities.map(normalizeAmenity).filter(Boolean)));
    }
    return ['Wifi', 'Nước uống', 'Điều hòa', 'Khăn lạnh', 'Gối nằm', 'Chăn đắp'];
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null });

  // Interactive Seat Layout states
  const initialLayout = bus?.seatLayout || generateDefaultSeatLayout(bus?.totalSeats || 44, bus?.type || 'Xe Giường Nằm 44 Chỗ');
  const [columns, setColumns] = useState(initialLayout.columns || 5);
  const [lowerFloor, setLowerFloor] = useState(initialLayout.lowerFloor || []);
  const [upperFloor, setUpperFloor] = useState(initialLayout.upperFloor || []);
  const [activeFloor, setActiveFloor] = useState('lower');

  const API_BASE = API_BASE_URL;

  // Calculate live seats per floor
  const countLower = lowerFloor.flat().filter(c => c !== null && c !== undefined && String(c).trim() !== '').length;
  const countUpper = upperFloor.flat().filter(c => c !== null && c !== undefined && String(c).trim() !== '').length;
  const calculatedTotalSeats = countLower + countUpper;

  // Keep totalSeats synced
  useEffect(() => {
    setTotalSeats(calculatedTotalSeats);
  }, [calculatedTotalSeats]);

  const isAmenityActive = (amId) => {
    if (!Array.isArray(amenities)) return false;
    return amenities.some(item => {
      if (!item) return false;
      const lower = String(item).toLowerCase().trim();
      if (lower === amId.toLowerCase()) return true;
      const amObj = ALL_AMENITIES.find(a => a.id === amId);
      if (amObj) {
        if (lower === amObj.label.toLowerCase()) return true;
        if (amObj.aliases && amObj.aliases.some(al => lower.includes(al.toLowerCase()))) return true;
      }
      return false;
    });
  };

  const toggleAmenity = (amId) => {
    const active = isAmenityActive(amId);
    if (active) {
      setAmenities(prev => (prev || []).filter(item => {
        if (!item) return false;
        const lower = String(item).toLowerCase().trim();
        if (lower === amId.toLowerCase()) return false;
        const amObj = ALL_AMENITIES.find(a => a.id === amId);
        if (amObj) {
          if (lower === amObj.label.toLowerCase()) return false;
          if (amObj.aliases && amObj.aliases.some(al => lower.includes(al.toLowerCase()))) return false;
        }
        return true;
      }));
    } else {
      setAmenities(prev => [...(prev || []), amId]);
    }
  };

  // Toggle cell (seat vs empty)
  const toggleCell = (rowIndex, colIndex) => {
    const currentGrid = activeFloor === 'lower' ? lowerFloor : upperFloor;
    const setGrid = activeFloor === 'lower' ? setLowerFloor : setUpperFloor;

    const nextGrid = currentGrid.map((row, rIdx) => {
      if (rIdx !== rowIndex) return row;
      return row.map((cell, cIdx) => {
        if (cIdx !== colIndex) return cell;
        if (cell === null) {
          const prefix = activeFloor === 'lower' ? 'A' : 'B';
          const seatCount = currentGrid.flat().filter(c => c !== null).length;
          return `${prefix}${seatCount + 1}`;
        } else {
          return null;
        }
      });
    });
    setGrid(nextGrid);
  };

  // Resize columns
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
      if (lowerFloor.length > 1) setLowerFloor(lowerFloor.slice(0, -1));
    } else {
      if (upperFloor.length > 1) setUpperFloor(upperFloor.slice(0, -1));
    }
  };

  const resetToDefaultTemplate = () => {
    setConfirmModal({
      show: true,
      title: 'Thiết lập lại mẫu chuẩn',
      message: `Tải lại sơ đồ mẫu chuẩn cho loại xe ${busType}? Các chỉnh sửa tùy biến hiện tại sẽ được thay thế.`,
      onConfirm: () => {
        const match = busType.match(/\d+/);
        const seatsVal = match ? Number(match[0]) : 44;
        const template = generateDefaultSeatLayout(seatsVal, busType);
        setColumns(template.columns);
        setLowerFloor(template.lowerFloor);
        setUpperFloor(template.upperFloor);
        setActiveFloor('lower');
      }
    });
  };

  const toggleDoubleDecker = () => {
    if (upperFloor && upperFloor.length > 0) {
      setConfirmModal({
        show: true,
        title: 'Xóa Tầng 2',
        message: 'Bạn có chắc chắn muốn xóa Tầng 2? Sơ đồ ghế tầng trên sẽ bị xóa bỏ.',
        onConfirm: () => {
          setUpperFloor([]);
          setActiveFloor('lower');
        }
      });
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
    setError('');

    // 1. Kiểm tra biển số xe
    const cleanPlate = (plateNumber || '').trim().toUpperCase().replace(/\s*-\s*/g, '-').replace(/\s*\.\s*/g, '.');
    if (!cleanPlate) {
      setError('Vui lòng nhập biển số xe.');
      return;
    }
    // Định dạng biển số xe Việt Nam: 51B-044.44, 29B-123.45, 60B-12345, v.v.
    const plateRegex = /^[0-9]{2}[A-Z]{1,2}-[0-9]{3}\.[0-9]{2}$|^[0-9]{2}[A-Z]{1,2}-[0-9]{4,5}$/i;
    if (!plateRegex.test(cleanPlate)) {
      setError('Biển số xe không đúng định dạng chuẩn (Ví dụ: 51B-044.44 hoặc 51B-12345).');
      return;
    }

    // 2. Kiểm tra loại phương tiện
    if (!busType || !busType.trim()) {
      setError('Vui lòng chọn loại phương tiện & cấu hình.');
      return;
    }

    // 3. Kiểm tra sơ đồ ghế & tổng số ghế
    if (!calculatedTotalSeats || calculatedTotalSeats <= 0) {
      setError('Sơ đồ phương tiện phải có ít nhất 1 chỗ ngồi/giường.');
      return;
    }

    // 4. Kiểm tra trùng lặp mã ghế trên sơ đồ
    const allSeats = [
      ...lowerFloor.flat(),
      ...(upperFloor || []).flat()
    ]
      .filter(cell => cell !== null && cell !== undefined && String(cell).trim() !== '')
      .map(cell => String(cell).trim().toUpperCase());

    const seenSeats = new Set();
    const duplicates = [];
    for (const seat of allSeats) {
      if (seenSeats.has(seat)) {
        if (!duplicates.includes(seat)) duplicates.push(seat);
      } else {
        seenSeats.add(seat);
      }
    }
    if (duplicates.length > 0) {
      setError(`Sơ đồ ghế bị trùng lặp mã vị trí: ${duplicates.join(', ')}. Mỗi vị trí ghế phải có một mã định danh duy nhất.`);
      return;
    }

    // 5. Kiểm tra tiện ích
    if (!amenities || amenities.length === 0) {
      setError('Vui lòng chọn ít nhất 1 tiện ích phục vụ hành khách.');
      return;
    }

    // 6. Kiểm tra URL hình ảnh (nếu có nhập)
    if (imageUrl && imageUrl.trim() && !/^https?:\/\//i.test(imageUrl.trim())) {
      setError('URL hình ảnh không hợp lệ (phải bắt đầu bằng http:// hoặc https://).');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        plateNumber: cleanPlate,
        type: busType,
        totalSeats: Number(calculatedTotalSeats),
        amenities,
        images: imageUrl && imageUrl.trim() ? [imageUrl.trim()] : [DEFAULT_IMAGE],
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
      setError('Lỗi kết nối máy chủ. Vui lòng kiểm tra đường truyền.');
    } finally {
      setLoading(false);
    }
  };

  const isDoubleDecker = upperFloor && upperFloor.length > 0;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(4px)', zIndex: 1100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
    }}>
      <div style={{
        background: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        width: '100%', maxWidth: '1060px', maxHeight: '92vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>
        
        {/* Modal Header Bar matching screenshot 2 */}
        <div style={{
          padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#ffffff'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
            {/* Bus Icon Square */}
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px', background: '#eff6ff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px'
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  {isEdit ? 'Chỉnh sửa phương tiện:' : 'Thêm phương tiện mới:'}
                </h2>
                {/* Plate Badge */}
                <span style={{
                  border: '2px solid #cbd5e1', borderRadius: '8px', padding: '2px 10px',
                  fontWeight: '800', fontFamily: 'monospace', color: '#0f172a', fontSize: '0.95rem', background: '#ffffff'
                }}>
                  {plateNumber || 'Mới'}
                </span>
                {/* Type Pill */}
                <span style={{ background: '#eff6ff', color: '#2563eb', padding: '3px 10px', borderRadius: '8px', fontWeight: '700', fontSize: '0.75rem' }}>
                  {busType}
                </span>
                {/* Status Pill */}
                <span style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', padding: '3px 10px', borderRadius: '12px', fontWeight: '700', fontSize: '0.72rem' }}>
                  • Đã kiểm định
                </span>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.75rem', margin: '4px 0 0 0' }}>
                Cập nhật thông số kỹ thuật, tiện ích phục vụ và tùy biến cấu hình sơ đồ ghế theo tầng.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.35rem', cursor: 'pointer', padding: '4px' }}
          >
            ✕
          </button>
        </div>

        {/* Modal Form Content */}
        <form noValidate onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          {error && (
            <div style={{
              margin: '0.85rem 1.5rem 0 1.5rem',
              padding: '0.65rem 1rem',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '10px',
              color: '#b91c1c',
              fontSize: '0.8rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.2" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{error}</span>
            </div>
          )}
          <div style={{
            display: 'grid', gridTemplateColumns: '360px 1fr', gap: '1.25rem',
            padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1
          }}>

            {/* LEFT COLUMN: THÔNG SỐ CƠ BẢN & TIỆN ÍCH */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Card 1: THÔNG SỐ CƠ BẢN */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#2563eb', fontWeight: '800', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
                  THÔNG SỐ CƠ BẢN
                </div>

                {/* Field 1: Biển số xe */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#334155' }}>Biển số xe *</label>
                  <div style={{ position: 'relative' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                    <input
                      type="text"
                      value={plateNumber}
                      onChange={(e) => {
                        setPlateNumber(e.target.value);
                        if (error) setError('');
                      }}
                      placeholder="Ví dụ: 51B-044.44"
                      style={{
                        width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.2rem', fontSize: '0.85rem',
                        fontWeight: '700', fontFamily: 'monospace', borderRadius: '8px',
                        border: (error && !plateNumber.trim()) ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                        outline: 'none',
                        background: (error && !plateNumber.trim()) ? '#fff5f5' : '#ffffff',
                        color: '#0f172a'
                      }}
                    />
                  </div>
                  {error && !plateNumber.trim() && (
                    <span style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: '600' }}>
                      * Vui lòng nhập biển số xe (Ví dụ: 51B-044.44)
                    </span>
                  )}
                </div>

                {/* Field 2: Loại phương tiện */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#334155' }}>Loại phương tiện &amp; Cấu hình</label>
                  <select
                    value={busType}
                    onChange={(e) => handleBusTypeChange(e.target.value)}
                    style={{
                      padding: '0.5rem 0.75rem', fontSize: '0.8rem', fontWeight: '600',
                      borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: '#ffffff'
                    }}
                  >
                    <optgroup label="Xe Giường Nằm Truyền Thống">
                      <option value="Xe Giường Nằm 44 Chỗ">Xe Giường Nằm 44 Chỗ (2 Tầng)</option>
                      <option value="Xe Giường Nằm 40 Chỗ">Xe Giường Nằm 40 Chỗ (2 Tầng)</option>
                      <option value="Xe Giường Nằm 34 Chỗ">Xe Giường Nằm 34 Chỗ (2 Tầng)</option>
                      <option value="Xe Giường Nằm 32 Chỗ">Xe Giường Nằm 32 Chỗ (2 Tầng)</option>
                    </optgroup>
                    <optgroup label="Xe Giường Phòng Cabin VIP">
                      <option value="Limousine 22 Phòng (WC)">Limousine 22 Phòng (WC)</option>
                      <option value="Limousine 20 Phòng (VIP)">Limousine 20 Phòng (VIP)</option>
                      <option value="Limousine 24 Phòng (VIP)">Limousine 24 Phòng (VIP)</option>
                    </optgroup>
                    <optgroup label="Xe Khách Ghế Ngồi">
                      <option value="Xe Ghế Ngồi 45 Chỗ">Xe Ghế Ngồi 45 Chỗ (Universe)</option>
                      <option value="Xe Ghế Ngồi 29 Chỗ">Xe Ghế Ngồi 29 Chỗ (County, Samco)</option>
                      <option value="Xe Ghế Ngồi 16 Chỗ">Xe Ghế Ngồi 16 Chỗ (Transit, Solati)</option>
                      <option value="Limousine Ghế Ngồi 9 Chỗ">Limousine Ghế Ngồi 9 Chỗ VIP</option>
                    </optgroup>
                  </select>
                </div>

                {/* Field 3: Tổng số ghế badge box */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#334155' }}>Tổng số ghế / giường</label>
                    <button
                      type="button"
                      onClick={resetToDefaultTemplate}
                      style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.7rem', fontWeight: '700', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '3px' }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                      Tự động tính từ sơ đồ
                    </button>
                  </div>
                  <div style={{
                    background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px',
                    padding: '0.5rem 0.75rem', color: '#1d4ed8', fontWeight: '700', fontSize: '0.8rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}>
                    <span>
                      {calculatedTotalSeats} giường {isDoubleDecker ? `(Tầng 1: ${countLower} | Tầng 2: ${countUpper})` : ''}
                    </span>
                    <span style={{ color: '#16a34a' }}>✓</span>
                  </div>
                </div>

                {/* Field 4: Image URL */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#334155' }}>URL hình ảnh đại diện xe</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="text"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      style={{
                        flex: 1, padding: '0.45rem 0.75rem', fontSize: '0.78rem',
                        borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => window.open(imageUrl || DEFAULT_IMAGE, '_blank')}
                      style={{
                        padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1',
                        background: '#f8fafc', color: '#334155', fontWeight: '700', fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap',
                        display: 'flex', alignItems: 'center', gap: '4px'
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                      Xem
                    </button>
                  </div>
                </div>
              </div>

              {/* Card 2: TIỆN ÍCH ĐI KÈM XE */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', boxSizing: 'border-box', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#2563eb', fontWeight: '800', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                    TIỆN ÍCH ĐI KÈM XE
                  </div>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Chọn tiện ích có sẵn</span>
                </div>

                {/* Checkbox Grid matching mockup 2 with strict 50-50 bounds */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.5rem', width: '100%', boxSizing: 'border-box' }}>
                  {ALL_AMENITIES.map((am) => {
                    const isChecked = isAmenityActive(am.id);
                    return (
                      <div
                        key={am.id}
                        onClick={() => toggleAmenity(am.id)}
                        style={{
                          padding: '0.4rem 0.5rem',
                          borderRadius: '8px',
                          border: isChecked ? '1.5px solid #3b82f6' : '1px solid #cbd5e1',
                          background: isChecked ? '#eff6ff' : '#ffffff',
                          color: isChecked ? '#1e40af' : '#475569',
                          fontWeight: isChecked ? '700' : '500',
                          fontSize: '0.72rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          userSelect: 'none',
                          transition: 'all 0.15s ease',
                          minHeight: '36px',
                          width: '100%',
                          boxSizing: 'border-box',
                          overflow: 'hidden'
                        }}
                      >
                        <div style={{
                          width: '16px', height: '16px', borderRadius: '4px',
                          border: isChecked ? 'none' : '1.5px solid #cbd5e1',
                          background: isChecked ? '#2563eb' : '#ffffff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#ffffff', fontSize: '0.65rem', fontWeight: '900', flexShrink: 0
                        }}>
                          {isChecked && '✓'}
                        </div>
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: isChecked ? '#2563eb' : '#64748b', flexShrink: 0, width: '14px', height: '14px'
                        }}>
                          {am.svg}
                        </div>
                        <span style={{ lineHeight: '1.1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                          {am.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: THIẾT KẾ SƠ ĐỒ GHẾ (VISUAL SEAT DESIGNER) */}
            <div style={{
              background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px',
              padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem'
            }}>
              {/* Header line of Seat Builder */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2"><rect x="9" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/><path d="M12 9v3M6 15v-3h12v3"/></svg>
                    Thiết kế sơ đồ ghế
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '0.72rem', margin: '2px 0 0 0' }}>
                    Click ô để sửa mã/xóa. Click dấu (+) để thêm vị trí giường mới.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={toggleDoubleDecker}
                  style={{
                    border: '1px solid #fca5a5', background: '#fff1f2', color: '#e11d48',
                    padding: '0.35rem 0.75rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '5px'
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  {isDoubleDecker ? 'Xóa Tầng 2' : 'Thêm Tầng 2'}
                </button>
              </div>

              {/* Controls bar: Columns select + Deck selector buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569' }}>Số cột dọc:</span>
                  <select
                    value={columns}
                    onChange={(e) => handleColumnsChange(e.target.value)}
                    style={{
                      padding: '0.35rem 0.65rem', fontSize: '0.75rem', fontWeight: '700',
                      borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', outline: 'none'
                    }}
                  >
                    <option value={3}>3 Cột (2 Dãy)</option>
                    <option value={4}>4 Cột (2 Dãy kép)</option>
                    <option value={5}>5 Cột (3 Dãy)</option>
                    <option value={6}>6 Cột (3 Dãy rộng)</option>
                  </select>
                </div>

                {/* Deck switcher pills matching screenshot 2 */}
                {isDoubleDecker && (
                  <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setActiveFloor('lower')}
                      style={{
                        padding: '0.35rem 0.85rem', borderRadius: '6px', border: 'none',
                        fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer',
                        background: activeFloor === 'lower' ? '#2563eb' : 'transparent',
                        color: activeFloor === 'lower' ? '#ffffff' : '#475569',
                        display: 'flex', alignItems: 'center', gap: '4px'
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polygon points="2 17 12 22 22 17"/><polygon points="2 12 12 17 22 12"/></svg>
                      Tầng dưới (Tầng 1)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveFloor('upper')}
                      style={{
                        padding: '0.35rem 0.85rem', borderRadius: '6px', border: 'none',
                        fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer',
                        background: activeFloor === 'upper' ? '#2563eb' : 'transparent',
                        color: activeFloor === 'upper' ? '#ffffff' : '#475569',
                        display: 'flex', alignItems: 'center', gap: '4px'
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polygon points="2 17 12 22 22 17"/><polygon points="2 12 12 17 22 12"/></svg>
                      Tầng trên (Tầng 2)
                    </button>
                  </div>
                )}
              </div>

              {/* Visual Seat Map Container matching screenshot 2 */}
              <div style={{
                background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px',
                padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem',
                maxHeight: '380px', overflowY: 'auto'
              }}>
                {/* Driver & Entrance Top Bar */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  paddingBottom: '0.5rem', borderBottom: '1px dashed #cbd5e1', fontSize: '0.75rem', fontWeight: '700'
                }}>
                  <span style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2"><path d="M13 4v16M17 8l4 4-4 4M7 8L3 12l4 4"/></svg>
                    CỬA LÊN XUỐNG
                  </span>
                  <span style={{ color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    ĐẦU XE &amp; TÀI XẾ 
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                  </span>
                </div>

                {/* Seats Grid */}
                <div style={{
                  display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: '10px'
                }}>
                  {(activeFloor === 'lower' ? lowerFloor : upperFloor).map((row, rIdx) =>
                    row.map((cell, cIdx) => {
                      const isSeat = cell !== null && cell !== undefined && String(cell).trim() !== '';
                      return (
                        <div
                          key={`${rIdx}-${cIdx}`}
                          style={{
                            height: '56px', borderRadius: '10px',
                            border: isSeat ? '2px solid #2563eb' : '1.5px dashed #cbd5e1',
                            background: isSeat ? '#eff6ff' : '#ffffff',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            padding: '2px', position: 'relative', cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {isSeat ? (
                            <>
                              <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#1d4ed8' }}>
                                {cell}
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleCell(rIdx, cIdx)}
                                style={{
                                  background: 'none', border: 'none', color: '#ef4444',
                                  fontSize: '0.62rem', fontWeight: '600', cursor: 'pointer', padding: 0
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
                                background: 'none', border: 'none', color: '#94a3b8',
                                fontSize: '1.1rem', fontWeight: '600', cursor: 'pointer',
                                width: '100%', height: '100%'
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

                {/* Toolbar inside Grid: Add/Remove Rows & Preset info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px dashed #cbd5e1' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={addRow}
                      style={{
                        padding: '0.3rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1',
                        background: '#ffffff', color: '#0f172a', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer'
                      }}
                    >
                      + Hàng
                    </button>
                    <button
                      type="button"
                      onClick={removeRow}
                      style={{
                        padding: '0.3rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1',
                        background: '#ffffff', color: '#0f172a', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer'
                      }}
                    >
                      - Hàng
                    </button>
                  </div>

                  <span style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    Mẫu chuẩn {calculatedTotalSeats} chỗ
                  </span>
                </div>
              </div>

              {/* Bottom Legend Bar */}
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.72rem', color: '#64748b', fontWeight: '600', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#eff6ff', border: '1px solid #2563eb' }}></span>
                  Giường đã thiết lập
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#ffffff', border: '1px dashed #cbd5e1' }}></span>
                  Vị trí trống / Lối đi
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                  Vị trí khoang lái
                </span>
              </div>
            </div>

          </div>

          {/* Modal Footer Bar matching screenshot 2 */}
          <div style={{
            padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', background: '#ffffff',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span>Cập nhật gần nhất bởi <strong>admin_system</strong> lúc {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} Hôm nay</span>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none',
                  background: 'transparent', color: '#475569', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer'
                }}
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '0.55rem 1.5rem', borderRadius: '10px', border: 'none',
                  background: '#2563eb', color: '#ffffff', fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer',
                  boxShadow: '0 3px 6px rgba(37,99,235,0.25)', display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                {loading ? 'Đang lưu...' : 'Lưu lại'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Confirm Modal */}
      {confirmModal.show && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(2px)', zIndex: 1200,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0',
            width: '100%', maxWidth: '420px', padding: '1.25rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>
              {confirmModal.title}
            </h4>
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.8rem', color: '#64748b' }}>
              {confirmModal.message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setConfirmModal({ ...confirmModal, show: false })}
                style={{
                  padding: '0.45rem 0.95rem', borderRadius: '8px', border: '1px solid #cbd5e1',
                  background: '#ffffff', color: '#475569', fontWeight: '600', fontSize: '0.78rem', cursor: 'pointer'
                }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => { confirmModal.onConfirm(); setConfirmModal({ ...confirmModal, show: false }); }}
                style={{
                  padding: '0.45rem 0.95rem', borderRadius: '8px', border: 'none',
                  background: '#ef4444', color: '#ffffff', fontWeight: '700', fontSize: '0.78rem', cursor: 'pointer'
                }}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusModal;
