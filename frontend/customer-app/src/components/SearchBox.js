import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Calendar, Users, Search } from 'lucide-react';

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

  const popularLocations = [
    { name: 'Bến Xe Miền Đông', detail: 'Hồ Chí Minh' },
    { name: 'Bến Xe Miền Tây', detail: 'Hồ Chí Minh' },
    { name: 'Bến Xe An Sương', detail: 'Hồ Chí Minh' },
    { name: 'Bến Xe Ngã Tư Ga', detail: 'Hồ Chí Minh' },
    { name: 'Bến Xe Cần Thơ', detail: 'Cần Thơ' },
    { name: 'Bến Xe Cà Mau', detail: 'Cà Mau' },
    { name: 'Bến Xe Bạc Liêu', detail: 'Bạc Liêu' },
    { name: 'Bến Xe Liên Tỉnh Đà Lạt', detail: 'Lâm Đồng (Đà Lạt)' },
    { name: 'Bến Xe Trung Tâm Đà Nẵng', detail: 'Đà Nẵng' },
    { name: 'Bến Xe Phía Nam Nha Trang', detail: 'Khánh Hòa (Nha Trang)' }
  ];

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
    <div className="search-container-futa">
      <form onSubmit={onSubmit} className="search-box-futa">

        {/* Trip Type Selector */}
        <div className="trip-type-selector">
          <label className="radio-label">
            <input
              type="radio"
              name="tripType"
              value="one-way"
              checked={tripType === 'one-way'}
              onChange={() => setTripType('one-way')}
            />
            Một chiều
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="tripType"
              value="round-trip"
              checked={tripType === 'round-trip'}
              onChange={() => setTripType('round-trip')}
            />
            Khứ hồi
          </label>
        </div>

        {/* Search Input Fields */}
        <div className="search-inputs-grid">
          <div className="form-group" ref={fromRef} style={{ position: 'relative' }}>
            <label className="form-label">Điểm đi</label>
            <div className="input-icon-wrapper">
              <input
                type="text"
                className="form-control"
                placeholder="Chọn điểm đi"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setShowFromSuggestions(true);
                }}
                onFocus={() => setShowFromSuggestions(true)}
                required
              />
              <MapPin size={18} className="input-icon" />
            </div>

            {/* From Suggestions Dropdown */}
            {showFromSuggestions && (
              <div className="search-suggestions-dropdown">
                {popularLocations
                  .filter(loc =>
                    loc.name.toLowerCase().includes(from.toLowerCase()) ||
                    loc.detail.toLowerCase().includes(from.toLowerCase())
                  )
                  .map((loc, index) => (
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
                        <span className="suggestion-detail">{loc.detail}</span>
                      </div>
                    </div>
                  ))}
                {popularLocations.filter(loc =>
                  loc.name.toLowerCase().includes(from.toLowerCase()) ||
                  loc.detail.toLowerCase().includes(from.toLowerCase())
                ).length === 0 && (
                    <div className="no-suggestions">Không tìm thấy địa điểm</div>
                  )}
              </div>
            )}
          </div>

          <div className="form-group" ref={toRef} style={{ position: 'relative' }}>
            <label className="form-label">Điểm đến</label>
            <div className="input-icon-wrapper">
              <input
                type="text"
                className="form-control"
                placeholder="Chọn điểm đến"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setShowToSuggestions(true);
                }}
                onFocus={() => setShowToSuggestions(true)}
                required
              />
              <MapPin size={18} className="input-icon" style={{ color: 'var(--accent)' }} />
            </div>

            {/* To Suggestions Dropdown */}
            {showToSuggestions && (
              <div className="search-suggestions-dropdown">
                {popularLocations
                  .filter(loc =>
                    loc.name.toLowerCase().includes(to.toLowerCase()) ||
                    loc.detail.toLowerCase().includes(to.toLowerCase())
                  )
                  .map((loc, index) => (
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
                        <span className="suggestion-detail">{loc.detail}</span>
                      </div>
                    </div>
                  ))}
                {popularLocations.filter(loc =>
                  loc.name.toLowerCase().includes(to.toLowerCase()) ||
                  loc.detail.toLowerCase().includes(to.toLowerCase())
                ).length === 0 && (
                    <div className="no-suggestions">Không tìm thấy địa điểm</div>
                  )}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Ngày đi</label>
            <div className="input-icon-wrapper">
              <input
                type="date"
                className="form-control"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
              <Calendar size={18} className="input-icon" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Số vé</label>
            <div className="input-icon-wrapper">
              <select
                className="form-control"
                value={passengers}
                onChange={(e) => setPassengers(Number(e.target.value))}
              >
                <option value={1}>1 vé</option>
                <option value={2}>2 vé</option>
                <option value={3}>3 vé</option>
                <option value={4}>4 vé</option>
              </select>
              <Users size={18} className="input-icon" />
            </div>
          </div>

          <button type="submit" className="btn btn-primary search-submit-btn">
            <Search size={18} />
            Tìm chuyến xe
          </button>
        </div>
      </form>
    </div>
  );
};

export default SearchBox;
