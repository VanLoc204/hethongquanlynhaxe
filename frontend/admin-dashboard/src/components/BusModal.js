import React, { useState } from 'react';

const AVAILABLE_AMENITIES = [
  'Tivi LED', 'Toilet', 'Sạc điện thoại', 'Đèn đọc sách', 'Rèm cửa',
  'Chăn đắp', 'Wifi', 'Nước uống', 'Điều hòa', 'Khăn lạnh', 'Gối nằm', 'Búa phá kính'
];

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80';

const BusModal = ({ bus, token, onClose, onSaved }) => {
  const isEdit = !!bus;
  const [plateNumber, setPlateNumber] = useState(bus?.plateNumber || '');
  const [busType, setBusType] = useState(bus?.type || 'Limousine 22 Phòng (WC)');
  const [totalSeats, setTotalSeats] = useState(bus?.totalSeats || 22);
  const [imageUrl, setImageUrl] = useState(bus?.images?.[0] || '');
  const [amenities, setAmenities] = useState(bus?.amenities || ['Wifi', 'Nước uống', 'Điều hòa', 'Khăn lạnh']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_BASE = 'http://localhost:8000/api/v1';

  const toggleAmenity = (am) =>
    setAmenities(prev => prev.includes(am) ? prev.filter(a => a !== am) : [...prev, am]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!plateNumber || !busType || !totalSeats) {
      setError('Vui lòng nhập đầy đủ Biển số, Loại xe và Số ghế.');
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
        images: imageUrl.trim() ? [imageUrl.trim()] : [DEFAULT_IMAGE]
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
      <div className="modal-content">
        <div className="modal-header">
          <h2>{isEdit ? `Chỉnh sửa: ${bus.plateNumber}` : 'Thêm phương tiện mới'}</h2>
          <button onClick={onClose} className="modal-close">&times;</button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label>Biển số xe</label>
              <input className="form-control" placeholder="VD: 49B-999.99" value={plateNumber}
                onChange={e => setPlateNumber(e.target.value)} required />
            </div>

            <div className="form-group">
              <label>Loại xe</label>
              <select className="form-control" value={busType}
                onChange={e => {
                  setBusType(e.target.value);
                  if (e.target.value.includes('22')) setTotalSeats(22);
                  else if (e.target.value.includes('34')) setTotalSeats(34);
                  else if (e.target.value.includes('40')) setTotalSeats(40);
                  else if (e.target.value.includes('45')) setTotalSeats(45);
                }}>
                <option value="Limousine 22 Phòng (WC)">Limousine 22 Phòng (WC)</option>
                <option value="Limousine 34 Giường">Limousine 34 Giường</option>
                <option value="Xe Giường Nằm 40 Chỗ">Xe Giường Nằm 40 Chỗ</option>
                <option value="Xe Ghế Ngồi 45 Chỗ">Xe Ghế Ngồi 45 Chỗ</option>
              </select>
            </div>

            <div className="form-group">
              <label>Tổng số ghế / giường</label>
              <input className="form-control" type="number" min="1" max="100"
                value={totalSeats} onChange={e => setTotalSeats(Number(e.target.value))} required />
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
