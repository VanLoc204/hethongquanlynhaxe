import React, { useState, useEffect, useRef } from 'react';
import API_BASE_URL from '../config/api';
import { MapPin, Calendar, Users, Search, ChevronDown, RotateCcw } from 'lucide-react';
import '../pages/customer/TripsPage.css';

const SearchBox = ({
  from,
  setFrom,
  to,
  setTo,
  date,
  setDate,
  passengers,
  setPassengers,
  tripType,
  setTripType,
  onSubmit
}) => {
  const fromRef = useRef(null);
  const toRef = useRef(null);

  const [showFromSuggestions, setShowFromSuggestions] = useState(false);
  const [showToSuggestions, setShowToSuggestions] = useState(false);

  const [fromLocations, setFromLocations] = useState([]);
  const [toLocations, setToLocations] = useState([]);

  // Set default date to today or tomorrow if empty
  useEffect(() => {
    if (!date) {
      const today = new Date().toISOString().split('T')[0];
      setDate(today);
    }
  }, [date, setDate]);

  // Fetch unique locations from database
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await fetch(API_BASE_URL + '/api/trips/routes');
        const data = await response.json();
        if (data && data.success) {
          setFromLocations(data.origins || []);
          setToLocations(data.destinations || []);
        }
      } catch (err) {
        console.error('Lỗi khi tải danh sách địa điểm:', err);
      }
    };
    fetchLocations();
  }, []);

  const resolveAbbr = (text) => {
    if (!text) return '';
    const clean = text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .replace(/[\.,]/g, '')
      .toLowerCase()
      .trim();

    const map = {
      'sg': 'ho chi minh',
      'hcm': 'ho chi minh',
      'tphcm': 'ho chi minh',
      'tp hcm': 'ho chi minh',
      'hn': 'ha noi',
      'nt': 'nha trang',
      'dl': 'da lat',
      'dn': 'da nang',
      'vt': 'vung tau',
      'ct': 'can tho',
      'hp': 'hai phong'
    };
    return map[clean] || clean;
  };

  const filteredFromLocations = fromLocations.filter(loc => {
    const canonicalInput = resolveAbbr(from);
    if (!canonicalInput) return true;
    const canonicalName = resolveAbbr(loc.name);
    const canonicalParent = loc.parent ? resolveAbbr(loc.parent) : '';
    return canonicalName.includes(canonicalInput) || canonicalParent.includes(canonicalInput);
  });

  const filteredToLocations = toLocations.filter(loc => {
    const canonicalInput = resolveAbbr(to);
    if (!canonicalInput) return true;
    const canonicalName = resolveAbbr(loc.name);
    const canonicalParent = loc.parent ? resolveAbbr(loc.parent) : '';
    return canonicalName.includes(canonicalInput) || canonicalParent.includes(canonicalInput);
  });

  // Click outside to close suggestion dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (fromRef.current && !fromRef.current.contains(event.target)) {
        setShowFromSuggestions(false);
      }
      if (toRef.current && !toRef.current.contains(event.target)) {
        setShowToSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleReset = () => {
    setFrom('');
    setTo('');
    const today = new Date().toISOString().split('T')[0];
    setDate(today);
    setPassengers(1);
  };

  return (
    <div className="home-search-wrapper">
      <form onSubmit={onSubmit} className="trips-search-form">
        <div className="trips-search-inputs-grid">
          {/* 1. Điểm đi */}
          <div className="trips-search-field" ref={fromRef}>
            <div className="trips-field-label">
              <MapPin size={13} color="#2563eb" />
              <span>ĐIỂM ĐI</span>
            </div>
            <div className="trips-field-input-box">
              <input
                type="text"
                className="trips-field-input"
                placeholder="Chọn điểm đi"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setShowFromSuggestions(true);
                }}
                onFocus={() => setShowFromSuggestions(true)}
              />
              <ChevronDown size={14} color="#94a3b8" />
            </div>

            {/* Suggestions */}
            {showFromSuggestions && (
              <div className="search-suggestions-dropdown" style={{ top: '100%', left: 0, right: 0, zIndex: 100 }}>
                {filteredFromLocations.map((loc, index) => (
                  <div
                    key={index}
                    className="suggestion-item"
                    onClick={() => {
                      setFrom(loc.name);
                      setShowFromSuggestions(false);
                    }}
                  >
                    <MapPin size={14} className="suggestion-icon" />
                    <div className="suggestion-content">
                      <span className="suggestion-name">{loc.name}</span>
                      <span className="suggestion-detail">
                        {loc.type === 'city' ? 'Tỉnh / Thành phố' : `Điểm đón tại ${loc.parent}`}
                      </span>
                    </div>
                  </div>
                ))}
                {filteredFromLocations.length === 0 && (
                  <div className="no-suggestions">Không tìm thấy địa điểm</div>
                )}
              </div>
            )}
          </div>

          {/* 2. Điểm đến */}
          <div className="trips-search-field" ref={toRef}>
            <div className="trips-field-label">
              <MapPin size={13} color="#ef4444" />
              <span>ĐIỂM ĐẾN</span>
            </div>
            <div className="trips-field-input-box">
              <input
                type="text"
                className="trips-field-input"
                placeholder="Chọn điểm đến"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setShowToSuggestions(true);
                }}
                onFocus={() => setShowToSuggestions(true)}
              />
              <ChevronDown size={14} color="#94a3b8" />
            </div>

            {/* Suggestions */}
            {showToSuggestions && (
              <div className="search-suggestions-dropdown" style={{ top: '100%', left: 0, right: 0, zIndex: 100 }}>
                {filteredToLocations.map((loc, index) => (
                  <div
                    key={index}
                    className="suggestion-item"
                    onClick={() => {
                      setTo(loc.name);
                      setShowToSuggestions(false);
                    }}
                  >
                    <MapPin size={14} className="suggestion-icon" style={{ color: 'var(--accent)' }} />
                    <div className="suggestion-content">
                      <span className="suggestion-name">{loc.name}</span>
                      <span className="suggestion-detail">
                        {loc.type === 'city' ? 'Tỉnh / Thành phố' : `Điểm trả tại ${loc.parent}`}
                      </span>
                    </div>
                  </div>
                ))}
                {filteredToLocations.length === 0 && (
                  <div className="no-suggestions">Không tìm thấy địa điểm</div>
                )}
              </div>
            )}
          </div>

          {/* 3. Ngày đi */}
          <div className="trips-search-field">
            <div className="trips-field-label">
              <Calendar size={13} color="#2563eb" />
              <span>NGÀY ĐI</span>
            </div>
            <div className="trips-field-input-box">
              <input
                type="date"
                className="trips-field-input"
                style={{ cursor: 'pointer' }}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* 4. Số vé */}
          <div className="trips-search-field">
            <div className="trips-field-label">
              <Users size={13} color="#2563eb" />
              <span>SỐ VÉ</span>
            </div>
            <div className="trips-field-input-box">
              <select
                className="trips-field-input"
                style={{ cursor: 'pointer' }}
                value={passengers}
                onChange={(e) => setPassengers(Number(e.target.value))}
              >
                <option value={1}>1 vé</option>
                <option value={2}>2 vé</option>
                <option value={3}>3 vé</option>
                <option value={4}>4 vé</option>
                <option value={5}>5 vé</option>
              </select>
              <ChevronDown size={14} color="#94a3b8" />
            </div>
          </div>

          {/* 5. Search Actions (Tìm xe & Làm mới) */}
          <div className="trips-search-actions">
            <button type="submit" className="trips-btn-search">
              <Search size={17} />
              <span>Tìm xe</span>
            </button>
            <button
              type="button"
              className="trips-btn-reset-search"
              onClick={handleReset}
              title="Làm mới bộ lọc tìm kiếm và quay về mặc định"
            >
              <RotateCcw size={15} />
              <span>Làm mới</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SearchBox;
