import React from 'react';
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
          <div className="form-group">
            <label className="form-label">Điểm đi</label>
            <div className="input-icon-wrapper">
              <input 
                type="text" 
                className="form-control" 
                placeholder="Chọn điểm đi" 
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                required
              />
              <MapPin size={18} className="input-icon" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Điểm đến</label>
            <div className="input-icon-wrapper">
              <input 
                type="text" 
                className="form-control" 
                placeholder="Chọn điểm đến" 
                value={to}
                onChange={(e) => setTo(e.target.value)}
                required
              />
              <MapPin size={18} className="input-icon" style={{ color: 'var(--accent)' }} />
            </div>
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
