import React, { useState } from 'react';
import { Package, Truck, User, Phone, MapPin, DollarSign, Search, CheckCircle2 } from 'lucide-react';

const ShipmentPage = () => {
  const [activeTab, setActiveTab] = useState('create');
  
  // Create Shipment Form State
  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [fromCity, setFromCity] = useState('Hồ Chí Minh');
  const [toCity, setToCity] = useState('Đà Lạt');
  const [weight, setWeight] = useState(1);
  const [content, setContent] = useState('');
  const [isCreated, setIsCreated] = useState(false);
  const [createdId, setCreatedId] = useState('');

  // Track Shipment State
  const [searchId, setSearchId] = useState('');
  const [searchResult, setSearchResult] = useState(null);

  const calculateFee = () => {
    const rate = 15000; // 15,000 VND per kg
    return weight * rate;
  };

  const handleCreateShipment = (e) => {
    e.preventDefault();
    if (!senderName || !senderPhone || !receiverName || !receiverPhone) {
      alert('Vui lòng nhập đầy đủ thông tin Người gửi và Người nhận.');
      return;
    }

    const newId = 'SHIP-' + Math.floor(100000 + Math.random() * 900000);
    const newShipment = {
      id: newId,
      senderName,
      senderPhone,
      receiverName,
      receiverPhone,
      fromCity,
      toCity,
      weight,
      content,
      fee: calculateFee(),
      status: 'Collected', // Collected, In Transit, Arrived, Delivered
      history: [
        { status: 'Collected', time: new Date().toLocaleTimeString('vi-VN') + ' ' + new Date().toLocaleDateString('vi-VN'), detail: 'Hệ thống tiếp nhận thông tin đơn hàng.' }
      ]
    };

    // Save to local storage
    const existing = JSON.parse(localStorage.getItem('shipments') || '[]');
    localStorage.setItem('shipments', JSON.stringify([newShipment, ...existing]));

    setCreatedId(newId);
    setIsCreated(true);
  };

  const handleTrackShipment = (e) => {
    e.preventDefault();
    if (!searchId) return;

    // Search in localStorage
    const existing = JSON.parse(localStorage.getItem('shipments') || '[]');
    const found = existing.find(s => s.id.toLowerCase() === searchId.trim().toLowerCase());

    if (found) {
      setSearchResult(found);
    } else {
      // Mock tracking if not found in local storage
      if (searchId.toUpperCase().startsWith('SHIP-')) {
        setSearchResult({
          id: searchId.toUpperCase(),
          senderName: 'Lê Văn Tám',
          receiverName: 'Nguyễn Thị Hoa',
          fromCity: 'Hồ Chí Minh',
          toCity: 'Đà Lạt',
          weight: 5,
          fee: 75000,
          status: 'In Transit',
          history: [
            { status: 'In Transit', time: '10:30 08/07/2026', detail: 'Đơn hàng đang trên xe chuyển đi Đà Lạt.' },
            { status: 'Collected', time: '08:15 08/07/2026', detail: 'Hệ thống tiếp nhận thông tin đơn hàng tại Trạm Quận 10.' }
          ]
        });
      } else {
        alert('Không tìm thấy mã vận đơn. Vui lòng thử lại với mã SHIP-123456');
        setSearchResult(null);
      }
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  return (
    <div className="section-container animate-fade-in" style={{ maxWidth: '900px', paddingBottom: '5rem' }}>
      
      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '2.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <Package size={32} style={{ color: 'var(--primary)' }} />
          Dịch Vụ Gửi Nhận Hàng Hóa Á Đông Express
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          Tạo yêu cầu gửi hàng nhanh theo tuyến xe khách, tra cứu hành trình vận chuyển hàng hóa thời gian thực.
        </p>
      </div>

      {/* Tab selectors */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '2.5rem' }}>
        <button 
          onClick={() => { setActiveTab('create'); setIsCreated(false); }}
          className={`btn ${activeTab === 'create' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '10px 24px', borderRadius: '30px' }}
        >
          <Truck size={18} style={{ marginRight: '6px' }} />
          Gửi hàng hóa mới
        </button>
        <button 
          onClick={() => { setActiveTab('track'); setSearchResult(null); }}
          className={`btn ${activeTab === 'track' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '10px 24px', borderRadius: '30px' }}
        >
          <Search size={18} style={{ marginRight: '6px' }} />
          Tra cứu vận đơn
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'create' ? (
        isCreated ? (
          <div className="glass-card animate-fade-in" style={{ padding: '3rem', textAlign: 'center' }}>
            <CheckCircle2 size={64} style={{ color: '#10b981', marginBottom: '1.5rem' }} />
            <h3 style={{ color: '#10b981', fontWeight: '800' }}>TẠO YÊU CẦU GỬI HÀNG THÀNH CÔNG!</h3>
            <p style={{ marginTop: '0.75rem', color: 'var(--text-secondary)' }}>
              Yêu cầu của bạn đã được ghi nhận trên hệ thống vận tải hàng hóa. Vui lòng mang hàng đến văn phòng gửi gần nhất.
            </p>
            
            <div style={{ 
              backgroundColor: '#f9fafb', 
              border: '1px solid var(--border-color)', 
              borderRadius: '8px', 
              padding: '1.5rem', 
              maxWidth: '360px', 
              margin: '2rem auto',
              textAlign: 'left'
            }}>
              <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem' }}>Mã vận đơn: <strong style={{ color: 'var(--primary)', float: 'right' }}>{createdId}</strong></p>
              <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem' }}>Lộ trình: <strong style={{ float: 'right' }}>{fromCity} → {toCity}</strong></p>
              <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem' }}>Cước phí: <strong style={{ color: 'var(--accent)', float: 'right' }}>{formatCurrency(calculateFee())}</strong></p>
            </div>

            <button 
              className="btn btn-primary"
              onClick={() => {
                setIsCreated(false);
                setSenderName('');
                setSenderPhone('');
                setReceiverName('');
                setReceiverPhone('');
                setContent('');
              }}
            >
              Gửi thêm hàng hóa khác
            </button>
          </div>
        ) : (
          <form className="glass-card animate-fade-in" style={{ padding: '2.5rem' }} onSubmit={handleCreateShipment}>
            <h3 style={{ fontWeight: '800', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              Thông tin ký gửi hàng hóa
            </h3>
            
            <div className="grid-2-col" style={{ marginBottom: '1.5rem' }}>
              
              {/* Left Column: Sender details */}
              <div>
                <h4 style={{ fontWeight: '700', color: 'var(--primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={18} />
                  Thông tin người gửi
                </h4>
                <div className="form-group">
                  <label className="form-label">Họ tên người gửi:</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Nhập họ tên người gửi" 
                    value={senderName} 
                    onChange={e => setSenderName(e.target.value)} 
                    required 
                  />
                </div>
                <div className="form-group" style={{ marginTop: '12px' }}>
                  <label className="form-label">Số điện thoại:</label>
                  <input 
                    type="tel" 
                    className="form-control" 
                    placeholder="Nhập số điện thoại người gửi" 
                    value={senderPhone} 
                    onChange={e => setSenderPhone(e.target.value)} 
                    required 
                  />
                </div>
              </div>

              {/* Right Column: Receiver details */}
              <div>
                <h4 style={{ fontWeight: '700', color: 'var(--accent)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={18} />
                  Thông tin người nhận
                </h4>
                <div className="form-group">
                  <label className="form-label">Họ tên người nhận:</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Nhập họ tên người nhận" 
                    value={receiverName} 
                    onChange={e => setReceiverName(e.target.value)} 
                    required 
                  />
                </div>
                <div className="form-group" style={{ marginTop: '12px' }}>
                  <label className="form-label">Số điện thoại:</label>
                  <input 
                    type="tel" 
                    className="form-control" 
                    placeholder="Nhập số điện thoại người nhận" 
                    value={receiverPhone} 
                    onChange={e => setReceiverPhone(e.target.value)} 
                    required 
                  />
                </div>
              </div>

            </div>

            <hr style={{ border: '0', borderTop: '1px solid var(--border-color)', margin: '2rem 0' }} />

            {/* Package details */}
            <h4 style={{ fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Package size={18} style={{ color: 'var(--primary)' }} />
              Thông tin bưu gửi
            </h4>

            <div className="grid-auto-fit" style={{ marginBottom: '2rem' }}>
              <div className="form-group">
                <label className="form-label">Điểm gửi:</label>
                <select className="form-control" value={fromCity} onChange={e => setFromCity(e.target.value)}>
                  <option value="Hồ Chí Minh">TP. Hồ Chí Minh</option>
                  <option value="Đà Lạt">Đà Lạt</option>
                  <option value="Nha Trang">Nha Trang</option>
                  <option value="Phan Thiết">Phan Thiết</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Điểm nhận:</label>
                <select className="form-control" value={toCity} onChange={e => setToCity(e.target.value)}>
                  <option value="Đà Lạt">Đà Lạt</option>
                  <option value="Hồ Chí Minh">TP. Hồ Chí Minh</option>
                  <option value="Nha Trang">Nha Trang</option>
                  <option value="Phan Thiết">Phan Thiết</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Khối lượng (kg):</label>
                <input 
                  type="number" 
                  min="1" 
                  max="100" 
                  className="form-control" 
                  value={weight} 
                  onChange={e => setWeight(parseInt(e.target.value) || 1)} 
                  required 
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label className="form-label">Nội dung / Mô tả hàng hóa:</label>
              <textarea 
                className="form-control" 
                rows="3" 
                placeholder="Ví dụ: Quần áo, tài liệu, đồ gia dụng..." 
                value={content}
                onChange={e => setContent(e.target.value)}
              ></textarea>
            </div>

            {/* Calculations & Submit */}
            <div className="flex-mobile-stack" style={{ 
              backgroundColor: 'rgba(59, 130, 246, 0.05)', 
              padding: '1.5rem 2rem', 
              borderRadius: '8px',
              border: '1px solid rgba(59, 130, 246, 0.1)'
            }}>
              <div>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>ƯỚC TÍNH CƯỚC PHÍ</span>
                <h3 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--accent)', margin: '4px 0 0 0' }}>
                  {formatCurrency(calculateFee())}
                </h3>
              </div>
              <button type="submit" className="btn btn-primary" style={{ padding: '12px 30px' }}>
                Xác nhận tạo đơn gửi hàng
              </button>
            </div>

          </form>
        )
      ) : (
        /* Track shipment view */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <form className="glass-card animate-fade-in" style={{ padding: '2rem' }} onSubmit={handleTrackShipment}>
            <label className="form-label" style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '8px', display: 'block' }}>
              Nhập mã vận đơn (VD: SHIP-902482)
            </label>
            <div className="flex-mobile-stack" style={{ gap: '15px' }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Nhập mã đơn gửi hàng của bạn..." 
                value={searchId}
                onChange={e => setSearchId(e.target.value)}
                style={{ flexGrow: 1 }}
                required
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '0 24px' }}>
                Tra cứu
              </button>
            </div>
          </form>

          {searchResult && (
            <div className="glass-card animate-fade-in" style={{ padding: '2rem' }}>
              <h3 style={{ fontWeight: '800', color: 'var(--primary)', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                Thông tin vận tải bưu gửi {searchResult.id}
              </h3>
              
              <div className="grid-auto-fit" style={{ marginBottom: '2rem' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>HÀNH TRÌNH CHUYỂN</span>
                  <p style={{ fontWeight: '700', margin: '4px 0 0 0' }}>{searchResult.fromCity} → {searchResult.toCity}</p>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>NGƯỜI GỬI</span>
                  <p style={{ fontWeight: '700', margin: '4px 0 0 0' }}>{searchResult.senderName}</p>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>NGƯỜI NHẬN</span>
                  <p style={{ fontWeight: '700', margin: '4px 0 0 0' }}>{searchResult.receiverName}</p>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>TRẠNG THÁI HIỆN TẠI</span>
                  <p style={{ fontWeight: '700', color: 'var(--accent)', margin: '4px 0 0 0' }}>
                    {searchResult.status === 'Collected' ? 'Đã thu gom' : 
                     searchResult.status === 'In Transit' ? 'Đang vận chuyển' : 'Đã giao hàng'}
                  </p>
                </div>
              </div>

              {/* Delivery History Timeline */}
              <h4 style={{ fontWeight: '700', marginBottom: '1.25rem' }}>Lịch sử giao nhận hàng hóa</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', position: 'relative', paddingLeft: '20px' }}>
                <div style={{
                  position: 'absolute',
                  left: '7px',
                  top: '10px',
                  bottom: '10px',
                  width: '2px',
                  backgroundColor: 'var(--border-color)'
                }}></div>

                {searchResult.history.map((hist, idx) => (
                  <div key={idx} style={{ position: 'relative' }}>
                    <div style={{
                      position: 'absolute',
                      left: '-18px',
                      top: '4px',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: idx === 0 ? 'var(--accent)' : 'var(--primary)',
                      border: '2px solid #ffffff'
                    }}></div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}>{hist.time}</span>
                    <h5 style={{ fontWeight: '700', margin: '2px 0 0 0' }}>{hist.status === 'Collected' ? 'Đã thu nhận' : 'Đang chuyển'}</h5>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px', margin: 0 }}>{hist.detail}</p>
                  </div>
                ))}
              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
};

export default ShipmentPage;
