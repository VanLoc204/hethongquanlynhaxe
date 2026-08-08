import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../../context/AuthContext';

const AttendantCheckinPage = () => {
  const { token, user } = useContext(AuthContext);
  const [trips, setTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [passengers, setPassengers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [loadingPassengers, setLoadingPassengers] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // QR verification State
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrInputPayload, setQrInputPayload] = useState('');
  const [qrVerifying, setQrVerifying] = useState(false);
  const [qrResult, setQrResult] = useState(null);

  // Live Camera QR Scanner state
  const html5QrCodeRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');

  // Dynamically load html5-qrcode library from CDN
  useEffect(() => {
    if (!window.Html5Qrcode) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
      script.async = true;
      document.body.appendChild(script);
      return () => {
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      };
    }
  }, []);

  // Monitor QR modal open/close to start/stop the camera feed
  useEffect(() => {
    let timer;
    if (showQRModal) {
      // Short delay to let the DOM modal container mount first
      timer = setTimeout(() => {
        initializeScanner();
      }, 350);
    } else {
      stopScanner();
    }
    return () => {
      if (timer) clearTimeout(timer);
      stopScanner();
    };
  }, [showQRModal]);

  const initializeScanner = async () => {
    if (!window.Html5Qrcode) {
      setCameraError('Chưa tải được thư viện máy quét. Vui lòng thử lại sau vài giây.');
      return;
    }
    setCameraError('');
    setCameraActive(false);

    try {
      const html5QrCode = new window.Html5Qrcode("qr-reader");
      html5QrCodeRef.current = html5QrCode;

      // Method 1: Try using getCameras to list and request device ID
      try {
        const devices = await window.Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          // Select back/rear camera if available
          let cameraId = devices[0].id;
          const backCamera = devices.find(device => 
            device.label.toLowerCase().includes('back') || 
            device.label.toLowerCase().includes('rear') || 
            device.label.toLowerCase().includes('sau') ||
            device.label.toLowerCase().includes('environment')
          );
          if (backCamera) {
            cameraId = backCamera.id;
          }

          await html5QrCode.start(
            cameraId,
            {
              fps: 10
            },
            (decodedText) => {
              if (navigator.vibrate) {
                navigator.vibrate(100);
              }
              setQrInputPayload(decodedText);
              handleVerifyQRData(decodedText);
            },
            (errorMessage) => {
              // Frame parse warning ignored
            }
          );
          setCameraActive(true);
          return; // Success!
        }
      } catch (deviceError) {
        console.warn("Failed to start with getCameras back-matching, falling back to facingMode constraint query...", deviceError);
      }

      // Method 2: Fallback query directly constraints mode environment
      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10
        },
        (decodedText) => {
          if (navigator.vibrate) {
            navigator.vibrate(100);
          }
          setQrInputPayload(decodedText);
          handleVerifyQRData(decodedText);
        },
        (errorMessage) => {
          // Frame parse warning ignored
        }
      );
      setCameraActive(true);
    } catch (err) {
      console.error("Camera startup error details:", err);
      // Informative helper message for HTTP vs HTTPS secure context blocks (typical for LAN testing)
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        setCameraError("Quyền truy cập Camera bị chặn vì bạn đang sử dụng kết nối HTTP không bảo mật (Trình duyệt yêu cầu HTTPS để cấp quyền camera khi truy cập qua mạng LAN hoặc Internet). Hãy chạy localhost hoặc dùng proxy HTTPS.");
      } else {
        setCameraError("Không truy cập được camera. Hãy đảm bảo đã cho phép quyền camera cho trình duyệt này và không có phần mềm nào khác đang bật camera.");
      }
    }
  };


  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
      } catch (err) {
        console.error("Errors stopping scanning context:", err);
      } finally {
        html5QrCodeRef.current = null;
        setCameraActive(false);
      }
    }
  };


  // Load schedule on mount
  useEffect(() => {
    fetchSchedule();
  }, [token]);

  const fetchSchedule = async () => {
    setLoadingSchedule(true);
    setError('');
    try {
      const res = await fetch('http://localhost:8000/api/v1/users/my-schedule', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTrips(data.trips);
        if (data.trips.length > 0) {
          // Auto select first trip
          setSelectedTrip(data.trips[0]);
          fetchPassengers(data.trips[0]._id);
        }
      } else {
        setError(data.message || 'Không thể tải lịch trình phân công.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ khi tải lịch trình.');
    } finally {
      setLoadingSchedule(false);
    }
  };

  const fetchPassengers = async (tripId) => {
    setLoadingPassengers(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`http://localhost:8000/api/v1/users/attendant/trip-bookings/${tripId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPassengers(data.bookings);
      } else {
        setError(data.message || 'Không thể tải danh sách hành khách.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ khi tải danh sách hành khách.');
    } finally {
      setLoadingPassengers(false);
    }
  };

  const handleSelectTrip = (trip) => {
    setSelectedTrip(trip);
    fetchPassengers(trip._id);
  };

  const handleManualCheckIn = async (bookingId) => {
    setActionLoading(bookingId);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`http://localhost:8000/api/v1/users/attendant/check-in/${bookingId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(`Xác nhận lên xe cho hành khách ${data.booking.customerName} thành công!`);
        // Refresh local list state
        setPassengers(prev => prev.map(p => p._id === bookingId ? { ...p, boarded: true, boardedAt: data.booking.boardedAt } : p));
      } else {
        setError(data.message || 'Check-in thủ công thất bại.');
      }
    } catch (err) {
      setError('Mất kết nối máy chủ.');
    } finally {
      setActionLoading(null);
    }
  };

  // HMAC generation simulation inside client
  const getSimulatedQR = (booking) => {
    return JSON.stringify({
      ticketId: booking._id,
      signature: booking.qrSignature || ''
    });
  };


  const handleVerifyQRData = async (payloadString) => {
    if (!payloadString.trim()) {
      setQrResult({ success: false, message: 'Dữ liệu mã QR trống.' });
      return;
    }

    setQrVerifying(true);
    setQrResult(null);
    
    try {
      let parsed;
      try {
        parsed = JSON.parse(payloadString.trim());
      } catch (e) {
        throw new Error('Định dạng mã QR không khớp (Yêu cầu JSON chuẩn gồm ticketId & signature)');
      }

      const res = await fetch('http://localhost:8000/api/v1/users/attendant/verify-ticket-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ticketId: parsed.ticketId,
          signature: parsed.signature
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setQrResult({
          success: true,
          message: 'Hợp lệ! Vé xanh. Mời hành khách lên xe.',
          booking: data.booking
        });
        // Update local passenger list if they are on this trip
        setPassengers(prev => prev.map(p => p._id === parsed.ticketId ? { ...p, boarded: true, boardedAt: data.booking.boardedAt } : p));
      } else {
        setQrResult({
          success: false,
          message: data.message || 'Xác thực vé thất bại.'
        });
      }
    } catch (err) {
      setQrResult({
        success: false,
        message: err.message || 'Lỗi server hoặc chất lượng signature không khớp.'
      });
    } finally {
      setQrVerifying(false);
    }
  };

  // Filter passengers list
  const filteredPassengers = passengers.filter(p => {
    const term = searchQuery.toLowerCase();
    return (
      p.customerName.toLowerCase().includes(term) ||
      p.customerPhone.includes(term) ||
      p.seats.some(seat => seat.toLowerCase().includes(term))
    );
  });

  const formatTime = (timeStr) => {
    return new Date(timeStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  return (
    <section className="panel" style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--card-border)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
        <div>
          <h2>Soát Vé & Check-in Hành Khách Lên Xe</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Nhân viên phụ xe quản lý danh sách chuyến xe được phân công, soát vé nhanh bằng camera QR hoặc duyệt thủ công.</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setShowQRModal(true);
            setQrInputPayload('');
            setQrResult(null);
          }}
          style={{ padding: '0.5rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}
        >
          Quét QR Soát Vé
        </button>
      </div>

      {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}
      {success && <div className="success-message" style={{ marginBottom: '1rem' }}>{success}</div>}

      <div style={{ display: 'flex', gap: '1.5rem', flexDirection: 'row', alignItems: 'stretch' }}>
        {/* Left Side: Schedule selection */}
        <div style={{ width: '320px', borderRight: '1px solid var(--card-border)', paddingRight: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Chuyến đi của bạn hôm nay</h3>
          {loadingSchedule ? (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>Đang tải lịch chạy...</div>
          ) : trips.length === 0 ? (
            <div style={{ padding: '1.5rem', background: '#f8fafc', color: 'var(--text-muted)', borderRadius: '6px', textAlign: 'center' }}>
              Không có chuyến đi nào được phân công cho bạn hôm nay.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {trips.map(trip => {
                const isActive = selectedTrip?._id === trip._id;
                return (
                  <div
                    key={trip._id}
                    onClick={() => handleSelectTrip(trip)}
                    style={{
                      padding: '0.85rem',
                      borderRadius: '6px',
                      border: isActive ? '2px solid var(--primary)' : '1px solid var(--card-border)',
                      background: isActive ? '#f0f7ff' : '#white',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 'bold', color: isActive ? 'var(--primary)' : 'inherit' }}>
                        {trip.routeId?.startPoint} ➔ {trip.routeId?.endPoint}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Giờ khởi hành: {formatTime(trip.departureTime)} ({formatDate(trip.departureTime)})
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Biển số: {trip.busId?.plateNumber} | {trip.busId?.type}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Onboard Booking manifested passengers */}
        <div style={{ flex: 1 }}>
          {selectedTrip ? (
            <>
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Tìm hành khách... (Tên, SĐT, Vị trí ghế)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  className="btn btn-secondary"
                  onClick={() => fetchPassengers(selectedTrip._id)}
                  disabled={loadingPassengers}
                  style={{ minWidth: '100px' }}
                >
                  Tải lại
                </button>
              </div>

              {loadingPassengers ? (
                <div style={{ textAlign: 'center', padding: '4rem 0' }}>Đang nạp danh sách hành khách đi xe...</div>
              ) : filteredPassengers.length === 0 ? (
                <div style={{ padding: '3rem', background: '#f8fafc', color: 'var(--text-muted)', borderRadius: '6px', textAlign: 'center' }}>
                  Không thấy hành khách nào khớp với bộ lọc tìm kiếm.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--card-border)' }}>
                        <th style={{ padding: '0.75rem 1rem' }}>Vị trí ghế</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Hành khách</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Điểm lên/xuống</th>
                        <th style={{ padding: '0.75rem 1rem', width: '150px' }}>Trạng thái</th>
                        <th style={{ padding: '0.75rem 1rem', width: '220px', textAlign: 'right' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPassengers.map(p => (
                        <tr key={p._id} style={{ borderBottom: '1px solid var(--card-border)', background: p.boarded ? '#f6ffed' : 'white' }}>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <strong style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>{p.seats.join(', ')}</strong>
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <div style={{ fontWeight: 'bold' }}>{p.customerName}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>SĐT: {p.customerPhone}</div>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>
                            <div>Lên: {p.pickup}</div>
                            <div>Xuống: {p.dropoff}</div>
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            {p.boarded ? (
                              <div>
                                <span style={{ backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', color: '#389e0d', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                  Đã lên xe
                                </span>
                                <div style={{ fontSize: '0.7rem', color: '#389e0d', marginTop: '0.25rem' }}>
                                  Quét lúc: {formatTime(p.boardedAt)}
                                </div>
                              </div>
                            ) : (
                              <span style={{ backgroundColor: '#fffbe6', border: '1px solid #ffe58f', color: '#d46b08', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                Chờ soát vé
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              {/* Manual button */}
                              <button
                                className="btn btn-primary"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: p.boarded ? '#d9d9d9' : '', borderColor: p.boarded ? '#d9d9d9' : '', cursor: p.boarded ? 'not-allowed' : 'pointer' }}
                                disabled={p.boarded || actionLoading === p._id}
                                onClick={() => handleManualCheckIn(p._id)}
                              >
                                {actionLoading === p._id ? 'Đang duyệt...' : 'Cho lên'}
                              </button>

                              {/* Test Scanning shortcut */}
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                                onClick={() => {
                                  setShowQRModal(true);
                                  const payload = getSimulatedQR(p);
                                  setQrInputPayload(payload);
                                  setQrResult(null);
                                }}
                              >
                                Test Scan QR
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
              Vui lòng chọn một chuyến đi bên danh sách để xem hành khách.
            </div>
          )}
        </div>
      </div>

      {/* GORGEOUS MODAL SCANNER */}
      {showQRModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{
            background: 'white',
            width: '520px',
            borderRadius: '8px',
            padding: '1.5rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            position: 'relative'
          }}>
            <h3 style={{ marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Hộp Soát Vé QR Thông Minh</span>
              <button
                onClick={() => setShowQRModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#999' }}
              >
                &times;
              </button>
            </h3>

            {/* Live Camera WebRTC Scanning Interface */}
            <div style={{
              width: '300px',
              height: '300px',
              margin: '0 auto 1rem',
              background: '#090d16',
              borderRadius: '12px',
              position: 'relative',
              overflow: 'hidden',
              border: cameraActive ? '2px solid var(--primary)' : '2px solid #ef4444',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
            }}>
              <div id="qr-reader" style={{ width: '100%', height: '100%' }}></div>
              
              {/* Spinner loader while camera starts */}
              {!cameraActive && !cameraError && (
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(17,17,17,0.9)', color: 'var(--primary)', zIndex: 10
                }}>
                  <div style={{
                    border: '3px solid rgba(59, 130, 246, 0.1)',
                    borderLeftColor: 'var(--primary)',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    animation: 'spinLoader 1s linear infinite',
                    marginBottom: '0.75rem'
                  }}></div>
                  <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>ĐANG KHỞI ĐỘNG CAMERA...</span>
                </div>
              )}

              {/* Error overlay if permission blocked */}
              {cameraError && (
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(17,17,17,0.95)', color: '#ef4444', padding: '1.5rem', textAlign: 'center', zIndex: 10
                }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold', lineHeight: '1.5' }}>{cameraError}</span>
                </div>
              )}

              {/* Viewfinder crosshairs and scanning laser laser */}
              {cameraActive && (
                <>
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '180px',
                    height: '180px',
                    zIndex: 4,
                    pointerEvents: 'none',
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
                    boxSizing: 'border-box'
                  }}>
                    {/* Top-Left Corner */}
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '20px', height: '20px', borderTop: '4px solid var(--primary)', borderLeft: '4px solid var(--primary)', borderRadius: '4px 0 0 0' }} />
                    {/* Top-Right Corner */}
                    <div style={{ position: 'absolute', top: 0, right: 0, width: '20px', height: '20px', borderTop: '4px solid var(--primary)', borderRight: '4px solid var(--primary)', borderRadius: '0 4px 0 0' }} />
                    {/* Bottom-Left Corner */}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, width: '20px', height: '20px', borderBottom: '4px solid var(--primary)', borderLeft: '4px solid var(--primary)', borderRadius: '0 0 0 4px' }} />
                    {/* Bottom-Right Corner */}
                    <div style={{ position: 'absolute', bottom: 0, right: 0, width: '20px', height: '20px', borderBottom: '4px solid var(--primary)', borderRight: '4px solid var(--primary)', borderRadius: '0 0 4px 0' }} />
                    
                    {/* Animated scanning laser line bounded inside the scanning square */}
                    <div style={{
                      position: 'absolute',
                      left: '6px',
                      right: '6px',
                      height: '3px',
                      background: 'linear-gradient(to right, transparent, var(--primary), transparent)',
                      boxShadow: '0 0 8px var(--primary)',
                      top: '0%',
                      zIndex: 5,
                      animation: 'scanLaser 2.2s infinite linear'
                    }} />
                  </div>
                </>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                Dữ liệu quét từ mã QR (Chuỗi JSON bảo mật HMAC)
              </label>
              <textarea
                className="form-control"
                style={{ fontFamily: 'monospace', fontSize: '0.8rem', width: '100%', height: '80px', boxSizing: 'border-box' }}
                placeholder='Dán payload dạng: {"ticketId": "...", "signature": "..."}'
                value={qrInputPayload}
                onChange={(e) => setQrInputPayload(e.target.value)}
              />
            </div>

            {qrVerifying ? (
              <div style={{ textAlign: 'center', padding: '1rem 0', fontWeight: 'bold', color: 'var(--primary)' }}>
                Đang xác thực chữ ký HMAC chống giả mạo...
              </div>
            ) : qrResult && (
              <div style={{
                padding: '0.85rem',
                borderRadius: '6px',
                marginBottom: '1rem',
                background: qrResult.success ? '#f6ffed' : '#fff5f5',
                border: qrResult.success ? '1px solid #b7eb8f' : '1px solid #ffa39e',
                color: qrResult.success ? '#389e0d' : '#cf1322'
              }}>
                <strong style={{ display: 'block', fontSize: '0.95rem', marginBottom: '0.2rem' }}>
                  {qrResult.success ? 'Vé Hợp Lệ' : 'Vé Không Hợp Lệ'}
                </strong>
                <span style={{ fontSize: '0.85rem' }}>{qrResult.message}</span>
                {qrResult.success && qrResult.booking && (
                  <div style={{ marginTop: '0.4rem', borderTop: '1px dashed #b7eb8f', paddingTop: '0.4rem', fontSize: '0.8rem', color: '#555' }}>
                    Khách: {qrResult.booking.customerName} | Ghế: {qrResult.booking.seats?.join(', ')}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowQRModal(false)}
              >
                Đóng hộp quét
              </button>
              <button
                className="btn btn-primary"
                onClick={() => handleVerifyQRData(qrInputPayload)}
                disabled={qrVerifying || !qrInputPayload.trim()}
              >
                Xác thực & Soát vé
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Styled animation keyframes inside React */}
      <style>{`
        @keyframes scanLaser {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
        @keyframes spinLoader {
          to { transform: rotate(360deg); }
        }
        #qr-reader {
          border: none !important;
        }
        #qr-reader video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          border-radius: 10px;
        }
      `}</style>

    </section>
  );
};

export default AttendantCheckinPage;
