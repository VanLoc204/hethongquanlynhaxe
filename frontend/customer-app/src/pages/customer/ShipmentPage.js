import React, { useState } from 'react';
import axios from 'axios';
import { Package, Truck, User, Phone, MapPin, DollarSign, Search, CheckCircle2, ArrowLeft, Mail, QrCode, CreditCard } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api/v1/trips';

const ShipmentPage = () => {
  const [activeTab, setActiveTab] = useState('create');
  
  // Create Shipment Form State
  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [fromCity, setFromCity] = useState('Hồ Chí Minh');
  const [toCity, setToCity] = useState('Đà Lạt');
  const [weight, setWeight] = useState(1);
  const [content, setContent] = useState('');
  
  // Payment step states: 'form', 'payment', 'success'
  const [paymentStep, setPaymentStep] = useState('form');
  const [createdShipment, setCreatedShipment] = useState(null);

  // Tự động cuộn lên đầu khi chuyển bước giao hàng (form -> payment -> success)
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  }, [paymentStep]);

  // Track Shipment State
  const [searchId, setSearchId] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [trackError, setTrackError] = useState('');

  const calculateFee = () => {
    const rate = 15000; // 15,000 VND per kg
    return weight * rate;
  };

  // Submit sender/receiver info and create shipment record (pending payment)
  const handleCreateShipment = async (e) => {
    e.preventDefault();
    if (!senderName || !senderPhone || !receiverName || !receiverPhone) {
      alert('Vui lòng nhập đầy đủ thông tin Người gửi và Người nhận.');
      return;
    }

    try {
      const res = await axios.post(`${API_BASE}/shipment/create`, {
        senderName,
        senderPhone,
        senderEmail,
        receiverName,
        receiverPhone,
        fromCity,
        toCity,
        weight,
        content,
        fee: calculateFee(),
        paymentType: 'immediate'
      });

      if (res.data.success) {
        setCreatedShipment(res.data.shipment);
        setPaymentStep('payment');
      } else {
        alert(res.data.message || 'Lỗi khi gửi yêu cầu gửi hàng.');
      }
    } catch (err) {
      console.error('Lỗi tạo đơn hàng:', err);
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi tạo yêu cầu gửi hàng.');
    }
  };

  // Webhook Simulation (Simulate PayOS Success)
  const handleSimulatePaymentSuccess = async () => {
    if (!createdShipment) return;
    try {
      const res = await axios.post(`${API_BASE}/payment/webhook`, {
        code: '00',
        desc: 'success',
        data: {
          orderCode: createdShipment.orderCode,
          amount: createdShipment.fee,
          description: `Thanh toan cuoc phi van don ${createdShipment._id}`
        }
      });

      if (res.data.success) {
        setCreatedShipment(prev => ({
          ...prev,
          paymentStatus: 'paid'
        }));
        
        // Save to local storage for quick list history fallback
        const newShip = {
          ...createdShipment,
          paymentStatus: 'paid',
          status: 'Collected'
        };
        const existing = JSON.parse(localStorage.getItem('shipments') || '[]');
        localStorage.setItem('shipments', JSON.stringify([newShip, ...existing]));

        setPaymentStep('success');
      } else {
        alert('Giả lập webhook thanh toán thất bại.');
      }
    } catch (err) {
      console.error('Lỗi giả lập thanh toán:', err);
      alert('Có lỗi xảy ra khi gửi dữ liệu giả lập webhook.');
    }
  };

  // Pay later at counter
  const handleConfirmPayLater = async () => {
    if (!createdShipment) return;
    try {
      const res = await axios.patch(`${API_BASE}/shipment/${createdShipment._id}`, {
        paymentType: 'later'
      });

      if (res.data.success) {
        setCreatedShipment(prev => ({
          ...prev,
          paymentType: 'later',
          paymentStatus: 'pending'
        }));

        // Save to local storage
        const newShip = {
          ...createdShipment,
          paymentType: 'later',
          paymentStatus: 'pending',
          status: 'Collected'
        };
        const existing = JSON.parse(localStorage.getItem('shipments') || '[]');
        localStorage.setItem('shipments', JSON.stringify([newShip, ...existing]));

        setPaymentStep('success');
      } else {
        alert(res.data.message || 'Lỗi cập nhật hình thức thanh toán.');
      }
    } catch (err) {
      console.error('Lỗi thiết lập thanh toán sau:', err);
      alert('Có lỗi xảy ra khi thiết lập thanh toán sau.');
    }
  };

  // Track Shipment via Database API
  const handleTrackShipment = async (e) => {
    e.preventDefault();
    if (!searchId) return;
    setTrackError('');
    setSearchResult(null);

    try {
      const res = await axios.get(`${API_BASE}/shipment/track/${searchId.trim()}`);
      if (res.data.success) {
        setSearchResult(res.data.shipment);
      }
    } catch (err) {
      console.error('Lỗi tra cứu vận đơn:', err);
      // Fallback search in localStorage
      const existing = JSON.parse(localStorage.getItem('shipments') || '[]');
      const found = existing.find(s => s.shipmentId?.toLowerCase() === searchId.trim().toLowerCase() || s.id?.toLowerCase() === searchId.trim().toLowerCase());

      if (found) {
        setSearchResult({
          shipmentId: found.shipmentId || found.id,
          senderName: found.senderName,
          senderPhone: found.senderPhone,
          senderEmail: found.senderEmail || '',
          receiverName: found.receiverName,
          receiverPhone: found.receiverPhone,
          fromCity: found.fromCity,
          toCity: found.toCity,
          weight: found.weight,
          content: found.content,
          fee: found.fee,
          status: found.status,
          paymentStatus: found.paymentStatus || 'paid',
          paymentType: found.paymentType || 'immediate',
          history: found.history
        });
      } else {
        setTrackError('Không tìm thấy mã vận đơn trên hệ thống. Vui lòng kiểm tra lại.');
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
          Dịch Vụ Gửi Nhận Hàng Hóa An Bình Express
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          Tạo yêu cầu gửi hàng nhanh theo tuyến xe khách, tra cứu hành trình vận chuyển hàng hóa thời gian thực.
        </p>
      </div>

      {/* Tab selectors (Only show when not in checkout steps) */}
      {paymentStep === 'form' && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '2.5rem' }}>
          <button 
            onClick={() => { setActiveTab('create'); }}
            className={`btn ${activeTab === 'create' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '10px 24px', borderRadius: '30px' }}
          >
            <Truck size={18} style={{ marginRight: '6px' }} />
            Gửi hàng hóa mới
          </button>
          <button 
            onClick={() => { setActiveTab('track'); setSearchResult(null); setTrackError(''); }}
            className={`btn ${activeTab === 'track' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '10px 24px', borderRadius: '30px' }}
          >
            <Search size={18} style={{ marginRight: '6px' }} />
            Tra cứu vận đơn
          </button>
        </div>
      )}

      {/* Create Shipment Flow */}
      {activeTab === 'create' && (
        <div>
          {paymentStep === 'form' ? (
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
                    <label className="form-label">Họ tên người gửi <span style={{ color: 'red' }}>*</span></label>
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
                    <label className="form-label">Số điện thoại <span style={{ color: 'red' }}>*</span></label>
                    <input 
                      type="tel" 
                      className="form-control" 
                      placeholder="Nhập số điện thoại người gửi" 
                      value={senderPhone} 
                      onChange={e => setSenderPhone(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="form-group" style={{ marginTop: '12px' }}>
                    <label className="form-label">Email (Nhận hóa đơn vận đơn)</label>
                    <input 
                      type="email" 
                      className="form-control" 
                      placeholder="email@example.com" 
                      value={senderEmail} 
                      onChange={e => setSenderEmail(e.target.value)} 
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
                    <label className="form-label">Họ tên người nhận <span style={{ color: 'red' }}>*</span></label>
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
                    <label className="form-label">Số điện thoại <span style={{ color: 'red' }}>*</span></label>
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
          ) : paymentStep === 'payment' ? (
            <div className="booking-layout">
              {/* PayOS QR Payment Screen */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
                  <button className="btn btn-secondary" style={{ padding: '4px 10px' }} onClick={() => setPaymentStep('form')}>
                    <ArrowLeft size={16} /> Quay lại
                  </button>
                  <h4 style={{ fontWeight: '700', margin: 0 }}>Thanh Toán Cước Vận Chuyển</h4>
                </div>
                
                <div className="glass-card" style={{ padding: '1.5rem', backgroundColor: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: '12px', textAlign: 'center', maxWidth: '400px', margin: '0 auto' }}>
                  <p style={{ fontWeight: '700', color: 'var(--primary)', marginBottom: '12px' }}>QUÉT MÃ THANH TOÁN VIETQR (PAYOS)</p>
                  
                  <img 
                    src={`https://img.vietqr.io/image/MB-0919210046-compact2.png?amount=${createdShipment.fee}&addInfo=SmartShip%20${createdShipment.orderCode}&accountName=HO%20VAN%20LOC`} 
                    alt="VietQR PayOS" 
                    style={{ width: '100%', maxWidth: '220px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', marginBottom: '1rem' }}
                  />
                  
                  <div style={{ textAlign: 'left', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '6px', margin: '0 auto', maxWidth: '300px' }}>
                    <div>Ngân hàng: <strong>MBBank</strong></div>
                    <div>Số tài khoản: <strong>0919210046</strong></div>
                    <div>Chủ tài khoản: <strong>HO VAN LOC</strong></div>
                    <div>Số tiền: <strong style={{ color: 'var(--accent)' }}>{formatCurrency(createdShipment.fee)}</strong></div>
                    <div>Nội dung chuyển khoản: <strong style={{ color: 'var(--primary)' }}>SmartShip {createdShipment.orderCode}</strong></div>
                  </div>

                  <div style={{ marginTop: '1.5rem' }}>
                    <button 
                      className="btn btn-success" 
                      style={{ width: '100%', padding: '10px', fontWeight: '700' }}
                      onClick={handleSimulatePaymentSuccess}
                    >
                      Giả lập chuyển khoản thành công (Webhook)
                    </button>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
                      Nhà xe tự động kiểm duyệt qua PayOS Webhook và cập nhật trạng thái đơn gửi hàng.
                    </span>
                  </div>
                </div>
              </div>

              {/* Sidebar options */}
              <div className="booking-sidebar" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h4 style={{ fontWeight: '700', marginBottom: '1.25rem' }}>Hình thức thanh toán khác</h4>
                  
                  <div className="glass-card" style={{ padding: '1.25rem', border: '1px solid #fed7aa', backgroundColor: '#fff7ed', borderRadius: '8px', marginBottom: '1.5rem' }}>
                    <h5 style={{ fontWeight: '700', color: '#c2410c', fontSize: '0.95rem', marginBottom: '6px' }}>Thanh toán sau tại quầy gửi hàng</h5>
                    <p style={{ fontSize: '0.85rem', color: '#9a3412', margin: 0 }}>
                      Bạn có thể chọn thanh toán bằng tiền mặt hoặc thẻ trực tiếp khi mang hàng hóa đến văn phòng ký gửi của An Bình Express.
                    </p>
                    <button 
                      className="btn btn-secondary" 
                      style={{ width: '100%', marginTop: '12px', border: '1px solid #ef6c00', color: '#ef6c00', backgroundColor: '#ffffff', fontWeight: '700' }}
                      onClick={handleConfirmPayLater}
                    >
                      Chọn thanh toán tại quầy
                    </button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Mã vận đơn:</span>
                    <span style={{ fontWeight: '700' }}>{createdShipment.shipmentId}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Hành trình:</span>
                    <span style={{ fontWeight: '700' }}>{createdShipment.fromCity} &rarr; {createdShipment.toCity}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Khối lượng:</span>
                    <span style={{ fontWeight: '700' }}>{createdShipment.weight} kg</span>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <span style={{ fontWeight: '700' }}>Cước phí:</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--accent)' }}>
                      {formatCurrency(createdShipment.fee)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Success billing step */
            <div className="glass-card animate-fade-in" style={{ padding: '2.5rem', maxWidth: '700px', margin: '0 auto', border: '2px solid rgba(16, 185, 129, 0.3)', backgroundColor: '#ffffff' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px dashed var(--border-color)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                <CheckCircle2 size={64} style={{ color: '#10b981', marginBottom: '1rem' }} />
                <h3 style={{ color: '#10b981', fontWeight: '800', margin: 0 }}>TẠO ĐƠN GỬI HÀNG THÀNH CÔNG</h3>
                <p style={{ color: 'var(--text-secondary)', margin: '5px 0 0 0', fontWeight: '500' }}>
                  Hóa Đơn Ký Gửi An Bình Express #{createdShipment.shipmentId}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                <div>
                  <h5 style={{ fontWeight: '700', color: 'var(--primary)', marginBottom: '8px' }}>Người gửi</h5>
                  <p style={{ margin: '4px 0' }}>Họ tên: <strong>{createdShipment.senderName}</strong></p>
                  <p style={{ margin: '4px 0' }}>Số điện thoại: <strong>{createdShipment.senderPhone}</strong></p>
                  {createdShipment.senderEmail && <p style={{ margin: '4px 0' }}>Email: <strong>{createdShipment.senderEmail}</strong></p>}
                  <p style={{ margin: '4px 0' }}>Gửi từ: <strong>{createdShipment.fromCity}</strong></p>
                </div>

                <div>
                  <h5 style={{ fontWeight: '700', color: 'var(--primary)', marginBottom: '8px' }}>Người nhận</h5>
                  <p style={{ margin: '4px 0' }}>Họ tên: <strong>{createdShipment.receiverName}</strong></p>
                  <p style={{ margin: '4px 0' }}>Số điện thoại: <strong>{createdShipment.receiverPhone}</strong></p>
                  <p style={{ margin: '4px 0' }}>Nhận tại: <strong>{createdShipment.toCity}</strong></p>
                </div>
              </div>

              <div style={{ borderBottom: '2px dashed var(--border-color)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span>Nội dung hàng hóa:</span>
                  <span style={{ fontWeight: '500' }}>{createdShipment.content || 'Hàng hóa thông thường'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Khối lượng hàng hóa:</span>
                  <span style={{ fontWeight: '700' }}>{createdShipment.weight} kg</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <span style={{ fontSize: '1rem', fontWeight: '700' }}>Trạng thái thanh toán:</span>
                  <div style={{ marginTop: '4px' }}>
                    {createdShipment.paymentStatus === 'paid' ? (
                      <span style={{ padding: '6px 12px', borderRadius: '20px', backgroundColor: '#e8f5e9', color: '#2e7d32', fontWeight: '700', fontSize: '0.85rem' }}>
                        ĐÃ THANH TOÁN (VietQR)
                      </span>
                    ) : (
                      <span style={{ padding: '6px 12px', borderRadius: '20px', backgroundColor: '#fff3e0', color: '#ef6c00', fontWeight: '700', fontSize: '0.85rem' }}>
                        THANH TOÁN TẠI QUẦY
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Cước phí:</span>
                  <h3 style={{ margin: 0, fontWeight: '800', color: 'var(--accent)' }}>{formatCurrency(createdShipment.fee)}</h3>
                </div>
              </div>

              {createdShipment.senderEmail && (
                <div style={{ padding: '10px 15px', backgroundColor: 'rgba(59, 130, 246, 0.05)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.1)', marginBottom: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Thông tin hóa đơn vận đơn đã được gửi về email <strong>{createdShipment.senderEmail}</strong> để tiện theo dõi.
                </div>
              )}

              <div style={{ textAlign: 'center', display: 'flex', gap: '15px', justifyContent: 'center' }}>
                <button className="btn btn-secondary" style={{ padding: '10px 24px' }} onClick={() => window.print()}>
                  In Hóa Đơn
                </button>
                <button 
                  className="btn btn-primary" 
                  style={{ padding: '10px 24px' }} 
                  onClick={() => {
                    setPaymentStep('form');
                    setSenderName('');
                    setSenderPhone('');
                    setSenderEmail('');
                    setReceiverName('');
                    setReceiverPhone('');
                    setContent('');
                    setCreatedShipment(null);
                  }}
                >
                  Hoàn tất & Quay lại
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Track Shipment Flow */}
      {activeTab === 'track' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <form className="glass-card animate-fade-in" style={{ padding: '2rem' }} onSubmit={handleTrackShipment}>
            <label className="form-label" style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '8px', display: 'block' }}>
              Nhập mã vận đơn (VD: SHIP-123456)
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
            {trackError && <p style={{ color: 'red', marginTop: '8px', fontSize: '0.9rem', fontWeight: '500' }}>{trackError}</p>}
          </form>

          {searchResult && (
            <div className="glass-card animate-fade-in" style={{ padding: '2rem' }}>
              <h3 style={{ fontWeight: '800', color: 'var(--primary)', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                Thông tin vận tải bưu gửi {searchResult.shipmentId}
              </h3>
              
              <div className="grid-auto-fit" style={{ marginBottom: '2rem' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>HÀNH TRÌNH CHUYỂN</span>
                  <p style={{ fontWeight: '700', margin: '4px 0 0 0' }}>{searchResult.fromCity} &rarr; {searchResult.toCity}</p>
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
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>TRẠNG THÁI</span>
                  <p style={{ fontWeight: '700', color: 'var(--accent)', margin: '4px 0 0 0' }}>
                    {searchResult.status === 'Collected' ? 'Đã thu gom' : 
                     searchResult.status === 'In Transit' ? 'Đang vận chuyển' : 
                     searchResult.status === 'Arrived' ? 'Đã đến trạm đích' : 'Đã giao hàng'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>NỘI DUNG HÀNG HÓA</span>
                  <p style={{ margin: '4px 0', fontSize: '0.9rem' }}>{searchResult.content || 'Hàng hóa thông thường'}</p>
                  <p style={{ margin: '4px 0', fontSize: '0.9rem' }}>Khối lượng: <strong>{searchResult.weight} kg</strong></p>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>THANH TOÁN CƯỚC PHÍ</span>
                  <p style={{ margin: '4px 0', fontSize: '0.9rem' }}>Cước phí: <strong>{formatCurrency(searchResult.fee)}</strong></p>
                  <p style={{ margin: '4px 0' }}>
                    {searchResult.paymentStatus === 'paid' ? (
                      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '10px', backgroundColor: '#e8f5e9', color: '#2e7d32', fontSize: '0.75rem', fontWeight: 'bold' }}>ĐÃ THANH TOÁN</span>
                    ) : (
                      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '10px', backgroundColor: '#fff3e0', color: '#ef6c00', fontSize: '0.75rem', fontWeight: 'bold' }}>CHƯA THANH TOÁN</span>
                    )}
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

                {searchResult.history && searchResult.history.map((hist, idx) => (
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
                    <h5 style={{ fontWeight: '700', margin: '2px 0 0 0' }}>
                      {hist.status === 'Collected' ? 'Đã thu gom' : 
                       hist.status === 'In Transit' ? 'Đang vận chuyển' : 
                       hist.status === 'Arrived' ? 'Đã đến trạm' : 'Đã phát thành công'}
                    </h5>
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
