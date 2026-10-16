import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Calendar, Users, Search, ChevronDown } from 'lucide-react';

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
        const response = await fetch('http://localhost:8000/api/v1/trips/routes');
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

  return (
    <div className="home-search-wrapper">
      <form onSubmit={onSubmit} className="search-card-main">
        {/* Top Row: Radio Một chiều / Khứ hồi */}
        <div className="search-card-top-row">
          <div className="search-radio-group">
            <label className="search-radio-label">
              <input
                type="radio"
                name="tripType"
                value="one-way"
                checked={tripType === 'one-way'}
                onChange={() => setTripType('one-way')}
              />
              <span>Một chiều</span>
            </label>
            <label className="search-radio-label">
              <input
                type="radio"
                name="tripType"
                value="round-trip"
                checked={tripType === 'round-trip'}
                onChange={() => setTripType('round-trip')}
              />
              <span>Khứ hồi</span>
            </label>
          </div>
        </div>

        {/* 4-Input Grid */}
        <div className="search-inputs-grid-4">
          {/* 1. Điểm đi */}
          <div className="search-field-box" ref={fromRef}>
            <div className="search-field-label">
              <MapPin size={13} color="#2563eb" />
              <span>ĐIỂM ĐI</span>
            </div>
            <div className="search-field-input-wrapper">
              <input
                type="text"
                className="search-field-input"
                placeholder="Chọn điểm đi (VD: Sài Gòn)"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setShowFromSuggestions(true);
                }}
                onFocus={() => setShowFromSuggestions(true)}
                required
              />
              <ChevronDown size={16} className="search-field-chevron" />
            </div>

            {/* Suggestions */}
            {showFromSuggestions && (
              <div className="search-suggestions-dropdown">
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
          <div className="search-field-box" ref={toRef}>
            <div className="search-field-label dest">
              <MapPin size={13} color="#0284c7" />
              <span>ĐIỂM ĐẾN</span>
            </div>
            <div className="search-field-input-wrapper">
              <input
                type="text"
                className="search-field-input"
                placeholder="Chọn điểm đến (VD: Nha Trang)"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setShowToSuggestions(true);
                }}
                onFocus={() => setShowToSuggestions(true)}
                required
              />
              <ChevronDown size={16} className="search-field-chevron" />
            </div>

            {/* Suggestions */}
            {showToSuggestions && (
              <div className="search-suggestions-dropdown">
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
          <div className="search-field-box">
            <div className="search-field-label">
              <Calendar size={13} color="#2563eb" />
              <span>NGÀY ĐI</span>
            </div>
            <div className="search-field-input-wrapper">
              <input
                type="date"
                className="search-field-input"
                style={{ cursor: 'pointer' }}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* 4. Số lượng vé */}
          <div className="search-field-box">
            <div className="search-field-label">
              <Users size={13} color="#2563eb" />
              <span>SỐ LƯỢNG VÉ</span>
            </div>
            <div className="search-field-input-wrapper">
              <select
                className="search-field-input"
                style={{ cursor: 'pointer' }}
                value={passengers}
                onChange={(e) => setPassengers(Number(e.target.value))}
              >
                <option value={1}>1 vé (1 Hành khách)</option>
                <option value={2}>2 vé (2 Hành khách)</option>
                <option value={3}>3 vé (3 Hành khách)</option>
                <option value={4}>4 vé (4 Hành khách)</option>
                <option value={5}>5 vé (5 Hành khách)</option>
              </select>
              <ChevronDown size={16} className="search-field-chevron" />
            </div>
          </div>
        </div>

        {/* Bottom Row: Search Button */}
        <div className="search-card-bottom-row" style={{ justifyContent: 'flex-end' }}>
          <button type="submit" className="search-btn-submit">
            <Search size={18} />
            <span>Tìm chuyến xe</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default SearchBox;
