import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../../context/AuthContext';

const AttendantCheckinPage = () => {
  const { token, user } = useContext(AuthContext);
  const [trips, setTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [passengers, setPassengers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'boarded'
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [loadingPassengers, setLoadingPassengers] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // QR verification State
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrVerifying, setQrVerifying] = useState(false);
  const [qrResult, setQrResult] = useState(null);

  // Giao diện lịch trình: Cho phép thu gọn trên di động
  const [tripsCollapsed, setTripsCollapsed] = useState(false);

  // Live Camera QR Scanner state
  const html5QrCodeRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');

  // Tải thư viện html5-qrcode qua CDN khi cần
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

  // Điều khiển camera khi mở hoặc đóng modal
  useEffect(() => {
    let timer;
    if (showQRModal) {
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
      setCameraError('Chưa tải được thư viện máy quét camera. Vui lòng thử lại sau vài giây.');
      return;
    }
    setCameraError('');
    setCameraActive(false);

    try {
      const html5QrCode = new window.Html5Qrcode("qr-reader");
      html5QrCodeRef.current = html5QrCode;

      // Ưu tiên camera sau (back/rear camera) trên điện thoại
      try {
        const devices = await window.Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
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
            { fps: 10 },
            (decodedText) => {
              if (navigator.vibrate) navigator.vibrate(100);
              handleVerifyQRData(decodedText);
            },
            () => {}
          );
          setCameraActive(true);
          return;
        }
      } catch (deviceError) {
        console.warn("Lỗi chọn camera cụ thể, chuyển sang chế độ facingMode environment:", deviceError);
      }

      // Phương án 2: Gọi chế độ camera môi trường
      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10 },
        (decodedText) => {
          if (navigator.vibrate) navigator.vibrate(100);
          handleVerifyQRData(decodedText);
        },
        () => {}
      );
      setCameraActive(true);
    } catch (err) {
      if (err?.name === 'AbortError' || err?.message?.toLowerCase().includes('interrupted')) {
        return;
      }
      console.error("Lỗi khởi động camera:", err);
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        setCameraError("Quyền truy cập Camera bị chặn vì bạn đang sử dụng kết nối HTTP không bảo mật (Trình duyệt yêu cầu HTTPS để cấp quyền camera khi truy cập qua mạng LAN hoặc Internet).");
      } else {
        setCameraError("Không truy cập được camera. Hãy đảm bảo đã cấp quyền camera cho trình duyệt này và không có ứng dụng nào khác đang chiếm quyền camera.");
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
        const msg = err?.message?.toLowerCase() || '';
        if (err?.name !== 'AbortError' && !msg.includes('interrupted') && !msg.includes('transition')) {
          console.warn("Lưu ý khi đóng camera:", err);
        }
      } finally {
        html5QrCodeRef.current = null;
        setCameraActive(false);
      }
    }
  };

  // Nạp lịch trình phân công khi vào trang
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
          // Tự động chọn chuyến đầu tiên nếu chưa chọn
          if (!selectedTrip) {
            setSelectedTrip(data.trips[0]);
            fetchPassengers(data.trips[0]._id);
          } else {
            // Cập nhật lại thông tin chuyến đang chọn
            const refreshed = data.trips.find(t => t._id === selectedTrip._id) || data.trips[0];
            setSelectedTrip(refreshed);
            fetchPassengers(refreshed._id);
          }
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
        setPassengers(data.bookings || []);
      } else {
        setError(data.message || 'Không thể tải danh sách hành khách của chuyến.');
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
        setSuccess(`Xác nhận lên xe cho hành khách ${data.booking.customerName} thành công.`);
        setPassengers(prev => prev.map(p => p._id === bookingId ? { ...p, boarded: true, boardedAt: data.booking.boardedAt } : p));
      } else {
        setError(data.message || 'Xác nhận check-in thủ công thất bại.');
      }
    } catch (err) {
      setError('Mất kết nối với máy chủ khi xác nhận lên xe.');
    } finally {
      setActionLoading(null);
    }
  };


  const handleVerifyQRData = async (qrDataString) => {
    if (!qrDataString || !qrDataString.trim()) {
      setQrResult({ success: false, message: 'Dữ liệu mã QR trống.' });
      return;
    }

    setQrVerifying(true);
    setQrResult(null);
    
    try {
      let parsed;
      try {
        parsed = JSON.parse(qrDataString.trim());
      } catch (e) {
        throw new Error('Định dạng mã QR không hợp lệ (Cần cấu trúc JSON hợp lệ gồm ticketId và signature)');
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
          message: 'Vé hợp lệ. Đã ghi nhận hành khách lên xe thành công.',
          booking: data.booking
        });
        setPassengers(prev => prev.map(p => p._id === parsed.ticketId ? { ...p, boarded: true, boardedAt: data.booking.boardedAt } : p));
      } else {
        setQrResult({
          success: false,
          message: data.message || 'Xác thực mã vé thất bại.'
        });
      }
    } catch (err) {
      setQrResult({
        success: false,
        message: err.message || 'Lỗi hệ thống hoặc chữ ký xác thực vé không khớp.'
      });
    } finally {
      setQrVerifying(false);
    }
  };

  // Bộ lọc danh sách hành khách
  const filteredPassengers = passengers.filter(p => {
    const term = searchQuery.toLowerCase().trim();
    const matchSearch = (
      p.customerName.toLowerCase().includes(term) ||
      p.customerPhone.includes(term) ||
      p.seats.some(seat => seat.toLowerCase().includes(term))
    );

    if (!matchSearch) return false;

    if (statusFilter === 'pending') return !p.boarded;
    if (statusFilter === 'boarded') return p.boarded;
    return true;
  });

  const boardedCount = passengers.filter(p => p.boarded).length;
  const pendingCount = passengers.filter(p => !p.boarded).length;

  const formatTime = (timeStr) => {
    if (!timeStr) return '--:--';
    return new Date(timeStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Gom nhóm chuyến xe theo ngày
  const groupTripsByDate = (tripsList) => {
    const groups = {};
    tripsList.forEach(trip => {
      const dateKey = new Date(trip.departureTime).toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(trip);
    });
    return groups;
  };

  const getHeaderDateLabel = (dateStr) => {
    const tripDate = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const isToday = tripDate.toDateString() === today.toDateString();
    const isTomorrow = tripDate.toDateString() === tomorrow.toDateString();

    const options = { weekday: 'long', day: '2-digit', month: '2-digit' };
    const formatted = tripDate.toLocaleDateString('vi-VN', options);

    if (isToday) return `Hôm nay (${formatted})`;
    if (isTomorrow) return `Ngày mai (${formatted})`;
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
      
      {/* CSS Cục Bộ Chuẩn Giao Diện Vận Hành Phụ Xe - Responsive Toàn Diện & Không Dùng Icon */}
      <style>{`
        .checkin-panel-box {
          background: #ffffff;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          padding: 1.25rem 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .checkin-header-wrap {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.85rem;
        }

        .checkin-header-actions {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }

        .checkin-split-layout {
          display: grid;
          grid-template-columns: 340px 1fr;
          gap: 1.25rem;
          align-items: start;
        }

        /* Khung danh sách lịch trình phân công */
        .checkin-trips-scroll {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          max-height: 650px;
          overflow-y: auto;
          padding-right: 4px;
        }

        .checkin-trips-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .checkin-trips-scroll::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }
        .checkin-trips-scroll::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }

        .checkin-trip-item {
          padding: 0.85rem;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        /* Chế độ bảng trên Desktop, chế độ thẻ Card trên Mobile */
        .checkin-table-view {
          display: block;
          overflow-x: auto;
        }

        .checkin-card-view {
          display: none;
        }

        /* Responsive Tablet & Màn hình di động (<= 992px) */
        @media (max-width: 992px) {
          .checkin-split-layout {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          /* Thu ngắn danh sách lịch trình để ưu tiên thông tin và danh sách khách soát vé */
          .checkin-trips-scroll {
            max-height: 185px;
            gap: 0.5rem;
          }

          .checkin-trip-item {
            padding: 0.55rem 0.75rem !important;
            border-radius: 8px !important;
          }

          .checkin-trip-item .trip-route-title {
            font-size: 0.82rem !important;
          }

          .checkin-trip-item .trip-detail-meta {
            font-size: 0.7rem !important;
          }
        }

        /* Responsive Điện thoại (<= 768px) */
        @media (max-width: 768px) {
          .checkin-panel-box {
            padding: 1rem 0.85rem;
            border-radius: 12px;
            gap: 1rem;
          }

          .checkin-header-wrap {
            flex-direction: column;
            align-items: flex-start;
          }

          .checkin-header-actions {
            width: 100%;
          }

          .checkin-header-actions button {
            flex: 1;
            justify-content: center;
          }

          /* Ẩn bảng trên mobile, hiển thị danh sách dạng Card ngón tay dễ bấm */
          .checkin-table-view {
            display: none;
          }

          .checkin-card-view {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
          }
        }
      `}</style>

      {/* ========================================================= */}
      {/* VÙNG 1: KHỐI TRẮNG TIÊU ĐỀ & THAO TÁC SOÁT VÉ CHÍNH       */}
      {/* ========================================================= */}
      <div className="checkin-panel-box">
        <div className="checkin-header-wrap">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
                Soát Vé &amp; Check-in Hành Khách Lên Xe
              </h1>
              <span style={{
                background: '#eff6ff',
                color: '#2563eb',
                border: '1px solid #bfdbfe',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.68rem',
                fontWeight: '700'
              }}>
                Nhân Viên Phụ Xe
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '4px', margin: 0 }}>
              Quản lý danh sách chuyến xe được phân công, soát vé nhanh bằng camera quét mã QR hoặc duyệt thủ công trước giờ xuất bến.
            </p>
          </div>

          <div className="checkin-header-actions">
            <button
              onClick={() => {
                fetchSchedule();
                if (selectedTrip) fetchPassengers(selectedTrip._id);
              }}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#1e293b',
                fontWeight: '700',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.78rem',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                whiteSpace: 'nowrap'
              }}
              title="Tải lại lịch chạy và danh sách hành khách"
            >
              Làm Mới
            </button>

            <button
              onClick={() => {
                setShowQRModal(true);
                setQrResult(null);
              }}
              style={{
                backgroundColor: '#2563eb',
                border: 'none',
                color: '#ffffff',
                fontWeight: '700',
                padding: '0.5rem 1.25rem',
                borderRadius: '8px',
                fontSize: '0.78rem',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(37,99,235,0.25)',
                whiteSpace: 'nowrap'
              }}
            >
              Quét QR Soát Vé
            </button>
          </div>
        </div>

        {/* Thông báo trạng thái nếu có */}
        {error && (
          <div style={{
            background: '#fff1f2',
            border: '1px solid #fecdd3',
            color: '#be123c',
            padding: '0.65rem 1rem',
            borderRadius: '8px',
            fontSize: '0.75rem',
            fontWeight: '600'
          }}>
            Lưu ý: {error}
          </div>
        )}

        {success && (
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#15803d',
            padding: '0.65rem 1rem',
            borderRadius: '8px',
            fontSize: '0.75rem',
            fontWeight: '600'
          }}>
            Thành công: {success}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* VÙNG 2: BỐ CỤC 2 CỘT CHUẨN ĐIỀU HÀNH & RESPONSIVE         */}
      {/* ========================================================= */}
      <div className="checkin-split-layout">
        
        {/* CỘT TRÁI: LỊCH TRÌNH NHẬN PHÂN CÔNG */}
        <div className="checkin-panel-box" style={{ padding: '1.15rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '0.92rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Lịch Trình Phân Công
              </h2>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>
                ({trips.length} chuyến)
              </span>
            </div>
            {trips.length > 0 && (
              <button
                type="button"
                onClick={() => setTripsCollapsed(!tripsCollapsed)}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '3px 9px',
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  color: '#334155',
                  cursor: 'pointer'
                }}
              >
                {tripsCollapsed ? 'Mở rộng' : 'Thu gọn'}
              </button>
            )}
          </div>

          {/* Thanh hiển thị chuyến rút gọn khi phụ xe chọn thu gọn để tập trung soát vé */}
          {tripsCollapsed && selectedTrip && (
            <div style={{
              marginTop: '0.65rem',
              padding: '0.6rem 0.85rem',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '6px'
            }}>
              <div>
                <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#1d4ed8', textTransform: 'uppercase', display: 'block' }}>
                  Chuyến Đang Chọn
                </span>
                <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#0f172a' }}>
                  {selectedTrip.routeId?.startPoint} ➔ {selectedTrip.routeId?.endPoint} ({formatTime(selectedTrip.departureTime)})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setTripsCollapsed(false)}
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '5px',
                  padding: '3px 8px',
                  fontSize: '0.7rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Đổi chuyến
              </button>
            </div>
          )}

          {!tripsCollapsed && (
            <>
              {loadingSchedule ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 0', color: '#64748b', fontSize: '0.8rem' }}>
                  Đang tải lịch trình chạy xe...
                </div>
              ) : trips.length === 0 ? (
                <div style={{ padding: '2rem 1rem', background: '#f8fafc', color: '#64748b', borderRadius: '10px', textAlign: 'center', border: '1px dashed #cbd5e1' }}>
                  <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#334155' }}>Không có chuyến xe nào được phân công</div>
                </div>
              ) : (() => {
                const grouped = groupTripsByDate(trips);
                return (
                  <div className="checkin-trips-scroll" style={{ marginTop: '0.75rem' }}>
                    {Object.keys(grouped).map(dateKey => (
                      <div key={dateKey}>
                        <div style={{
                          fontSize: '0.68rem',
                          fontWeight: '800',
                          textTransform: 'uppercase',
                          color: '#1e40af',
                          marginBottom: '0.4rem',
                          letterSpacing: '0.5px',
                          backgroundColor: '#eff6ff',
                          padding: '3px 8px',
                          borderRadius: '5px',
                          border: '1px solid #dbeafe'
                        }}>
                          {getHeaderDateLabel(dateKey)}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                          {grouped[dateKey].map(trip => {
                            const isActive = selectedTrip?._id === trip._id;
                            return (
                              <div
                                key={trip._id}
                                className="checkin-trip-item"
                                onClick={() => handleSelectTrip(trip)}
                                style={{
                                  border: isActive ? '2px solid #2563eb' : '1px solid #e2e8f0',
                                  borderLeft: isActive ? '5px solid #2563eb' : '1px solid #e2e8f0',
                                  background: isActive ? '#f0f7ff' : '#ffffff',
                                  boxShadow: isActive ? '0 3px 8px rgba(37,99,235,0.12)' : 'none'
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                  <span className="trip-route-title" style={{
                                    fontWeight: '800',
                                    fontSize: '0.88rem',
                                    color: isActive ? '#1d4ed8' : '#0f172a'
                                  }}>
                                    {trip.routeId?.startPoint} ➔ {trip.routeId?.endPoint}
                                  </span>
                                </div>

                                <div className="trip-detail-meta" style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                                  <span>Giờ đi: <strong style={{ color: '#0f172a' }}>{formatTime(trip.departureTime)}</strong></span>
                                  <span>Biển số: <strong>{trip.busId?.plateNumber}</strong></span>
                                </div>

                                <div className="trip-detail-meta" style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                                  Dòng xe: {trip.busId?.type}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </>
          )}
        </div>

        {/* CỘT PHẢI: CHI TIẾT CHUYẾN XE & DANH SÁCH HÀNH KHÁCH */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {selectedTrip ? (
            <>
              {/* Thẻ tóm tắt thông tin chuyến xe đang chọn */}
              <div className="checkin-panel-box" style={{ background: '#f8fafc', padding: '1rem 1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Chuyến Đang Chọn
                    </span>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#0f172a', margin: '2px 0 4px 0' }}>
                      {selectedTrip.routeId?.startPoint} ➔ {selectedTrip.routeId?.endPoint}
                    </h2>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <span>Khởi hành: <strong style={{ color: '#0f172a' }}>{formatTime(selectedTrip.departureTime)}</strong> ({formatDate(selectedTrip.departureTime)})</span>
                      <span>•</span>
                      <span>Biển số: <strong style={{ color: '#0f172a' }}>{selectedTrip.busId?.plateNumber}</strong></span>
                      <span>•</span>
                      <span>Dòng xe: {selectedTrip.busId?.type}</span>
                    </div>
                  </div>

                  {/* 3 chỉ số tóm tắt của chuyến */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '700' }}>TỔNG VÉ</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#0f172a' }}>{passengers.length}</div>
                    </div>
                    <div style={{ background: '#ecfdf5', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '6px 12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.65rem', color: '#15803d', fontWeight: '700' }}>ĐÃ LÊN XE</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#15803d' }}>{boardedCount}</div>
                    </div>
                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '6px 12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.65rem', color: '#b45309', fontWeight: '700' }}>CHỜ SOÁT VÉ</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#b45309' }}>{pendingCount}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Khối chính: Bảng danh sách hành khách */}
              <div className="checkin-panel-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                    Danh Sách Hành Khách Đi Xe ({filteredPassengers.length})
                  </h3>

                  {/* Bộ lọc tab trạng thái */}
                  <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
                    <button
                      onClick={() => setStatusFilter('all')}
                      style={{
                        border: 'none',
                        background: statusFilter === 'all' ? '#ffffff' : 'transparent',
                        color: statusFilter === 'all' ? '#0f172a' : '#64748b',
                        fontWeight: '700',
                        fontSize: '0.72rem',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        boxShadow: statusFilter === 'all' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
                      }}
                    >
                      Tất cả ({passengers.length})
                    </button>
                    <button
                      onClick={() => setStatusFilter('pending')}
                      style={{
                        border: 'none',
                        background: statusFilter === 'pending' ? '#ffffff' : 'transparent',
                        color: statusFilter === 'pending' ? '#b45309' : '#64748b',
                        fontWeight: '700',
                        fontSize: '0.72rem',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        boxShadow: statusFilter === 'pending' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
                      }}
                    >
                      Chờ soát ({pendingCount})
                    </button>
                    <button
                      onClick={() => setStatusFilter('boarded')}
                      style={{
                        border: 'none',
                        background: statusFilter === 'boarded' ? '#ffffff' : 'transparent',
                        color: statusFilter === 'boarded' ? '#15803d' : '#64748b',
                        fontWeight: '700',
                        fontSize: '0.72rem',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        boxShadow: statusFilter === 'boarded' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
                      }}
                    >
                      Đã lên ({boardedCount})
                    </button>
                  </div>
                </div>

                {/* Thanh tìm kiếm hành khách */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Tìm theo tên hành khách, số điện thoại, vị trí ghế..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '0.55rem 0.85rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      outline: 'none',
                      backgroundColor: '#ffffff'
                    }}
                  />
                  <button
                    onClick={() => fetchPassengers(selectedTrip._id)}
                    disabled={loadingPassengers}
                    style={{
                      padding: '0.55rem 1rem',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#f8fafc',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: '700',
                      color: '#334155',
                      cursor: 'pointer'
                    }}
                  >
                    Tải Lại
                  </button>
                </div>

                {loadingPassengers ? (
                  <div style={{ textAlign: 'center', padding: '3.5rem 0', color: '#64748b', fontSize: '0.82rem' }}>
                    Đang nạp danh sách hành khách đi xe...
                  </div>
                ) : filteredPassengers.length === 0 ? (
                  <div style={{ padding: '2.5rem 1rem', background: '#f8fafc', color: '#64748b', borderRadius: '10px', textAlign: 'center', border: '1px dashed #cbd5e1' }}>
                    <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#334155' }}>Không có hành khách nào khớp bộ lọc</div>
                    <div style={{ fontSize: '0.72rem', marginTop: '3px' }}>Vui lòng thử tìm kiếm với từ khóa khác.</div>
                  </div>
                ) : (
                  <>
                    {/* BẢNG TRÊN MÀN HÌNH MÁY TÍNH (DESKTOP VIEW) */}
                    <div className="checkin-table-view">
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                            <th style={{ padding: '0.75rem 1rem', fontWeight: '800' }}>Vị trí ghế</th>
                            <th style={{ padding: '0.75rem 1rem', fontWeight: '800' }}>Hành khách</th>
                            <th style={{ padding: '0.75rem 1rem', fontWeight: '800' }}>Điểm lên / xuống</th>
                            <th style={{ padding: '0.75rem 1rem', fontWeight: '800', width: '140px' }}>Trạng thái</th>
                            <th style={{ padding: '0.75rem 1rem', fontWeight: '800', width: '220px', textAlign: 'right' }}>Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPassengers.map(p => (
                            <tr key={p._id} style={{ borderBottom: '1px solid #f1f5f9', background: p.boarded ? '#f0fdf4' : '#ffffff' }}>
                              <td style={{ padding: '0.85rem 1rem' }}>
                                <span style={{
                                  display: 'inline-block',
                                  backgroundColor: p.boarded ? '#dcfce7' : '#eff6ff',
                                  color: p.boarded ? '#15803d' : '#1d4ed8',
                                  border: `1px solid ${p.boarded ? '#bbf7d0' : '#bfdbfe'}`,
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  fontWeight: '800',
                                  fontSize: '0.82rem'
                                }}>
                                  {p.seats.join(', ')}
                                </span>
                              </td>

                              <td style={{ padding: '0.85rem 1rem' }}>
                                <div style={{ fontWeight: '800', color: '#0f172a' }}>{p.customerName}</div>
                                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>SĐT: {p.customerPhone}</div>
                              </td>

                              <td style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', color: '#334155' }}>
                                <div>Lên: <strong>{p.pickup}</strong></div>
                                <div style={{ color: '#64748b', marginTop: '2px' }}>Xuống: {p.dropoff}</div>
                              </td>

                              <td style={{ padding: '0.85rem 1rem' }}>
                                {p.boarded ? (
                                  <div>
                                    <span style={{
                                      backgroundColor: '#dcfce7',
                                      color: '#15803d',
                                      border: '1px solid #bbf7d0',
                                      padding: '2px 8px',
                                      borderRadius: '6px',
                                      fontSize: '0.72rem',
                                      fontWeight: '800'
                                    }}>
                                      Đã lên xe
                                    </span>
                                    {p.boardedAt && (
                                      <div style={{ fontSize: '0.68rem', color: '#166534', marginTop: '2px' }}>
                                        Lúc: {formatTime(p.boardedAt)}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span style={{
                                    backgroundColor: '#fffbeb',
                                    color: '#b45309',
                                    border: '1px solid #fde68a',
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    fontSize: '0.72rem',
                                    fontWeight: '800'
                                  }}>
                                    Chờ soát vé
                                  </span>
                                )}
                              </td>

                              <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                                <button
                                  onClick={() => handleManualCheckIn(p._id)}
                                  disabled={p.boarded || actionLoading === p._id}
                                  style={{
                                    backgroundColor: p.boarded ? '#f1f5f9' : '#2563eb',
                                    color: p.boarded ? '#94a3b8' : '#ffffff',
                                    border: 'none',
                                    padding: '6px 14px',
                                    borderRadius: '6px',
                                    fontSize: '0.78rem',
                                    fontWeight: '700',
                                    cursor: p.boarded ? 'not-allowed' : 'pointer',
                                    boxShadow: p.boarded ? 'none' : '0 2px 4px rgba(37,99,235,0.2)'
                                  }}
                                >
                                  {actionLoading === p._id ? 'Đang duyệt...' : p.boarded ? 'Đã lên xe' : 'Cho lên xe'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* DANH SÁCH DẠNG CARD TRÊN ĐIỆN THOẠI (MOBILE VIEW CHO PHỤ XE - GỌN GÀNG NHƯ THẺ CHUYẾN XE) */}
                    <div className="checkin-card-view">
                      {filteredPassengers.map(p => (
                        <div
                          key={p._id}
                          style={{
                            background: p.boarded ? '#f0fdf4' : '#ffffff',
                            border: `1px solid ${p.boarded ? '#bbf7d0' : '#e2e8f0'}`,
                            borderLeft: `4px solid ${p.boarded ? '#10b981' : '#2563eb'}`,
                            borderRadius: '8px',
                            padding: '0.65rem 0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.75rem'
                          }}
                        >
                          {/* Cột trái: Thông tin ghế, tên, SĐT và lộ trình */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '3px' }}>
                              <span style={{
                                backgroundColor: p.boarded ? '#dcfce7' : '#eff6ff',
                                color: p.boarded ? '#15803d' : '#1d4ed8',
                                border: `1px solid ${p.boarded ? '#bbf7d0' : '#bfdbfe'}`,
                                padding: '1px 7px',
                                borderRadius: '5px',
                                fontWeight: '900',
                                fontSize: '0.8rem',
                                whiteSpace: 'nowrap'
                              }}>
                                Ghế: {p.seats.join(', ')}
                              </span>
                              <span style={{
                                fontWeight: '800',
                                fontSize: '0.88rem',
                                color: '#0f172a',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {p.customerName}
                              </span>
                            </div>

                            <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span>SĐT: <a href={`tel:${p.customerPhone}`} style={{ color: '#2563eb', fontWeight: '700', textDecoration: 'none' }}>{p.customerPhone}</a></span>
                              <span style={{ color: '#cbd5e1' }}>|</span>
                              <span style={{ color: '#334155' }}>
                                Lên: <strong style={{ color: '#0f172a' }}>{p.pickup}</strong> ➔ {p.dropoff}
                              </span>
                            </div>
                          </div>

                          {/* Cột phải: Trạng thái hoặc nút thao tác duyệt nhanh */}
                          <div style={{ flexShrink: 0, textAlign: 'right' }}>
                            {p.boarded ? (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                <span style={{
                                  backgroundColor: '#dcfce7',
                                  color: '#15803d',
                                  border: '1px solid #bbf7d0',
                                  padding: '3px 8px',
                                  borderRadius: '5px',
                                  fontSize: '0.7rem',
                                  fontWeight: '800',
                                  whiteSpace: 'nowrap'
                                }}>
                                  Đã lên xe
                                </span>
                                {p.boardedAt && (
                                  <span style={{ fontSize: '0.65rem', color: '#166534', fontWeight: '600' }}>
                                    {formatTime(p.boardedAt)}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleManualCheckIn(p._id)}
                                disabled={actionLoading === p._id}
                                style={{
                                  backgroundColor: '#2563eb',
                                  color: '#ffffff',
                                  border: 'none',
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: '700',
                                  cursor: actionLoading === p._id ? 'not-allowed' : 'pointer',
                                  whiteSpace: 'nowrap',
                                  boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
                                }}
                              >
                                {actionLoading === p._id ? 'Đang duyệt...' : 'Cho lên xe'}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="checkin-panel-box" style={{ textAlign: 'center', padding: '4rem 1rem', color: '#64748b' }}>
              <div style={{ fontWeight: '800', fontSize: '0.95rem', color: '#334155' }}>Vui lòng chọn một chuyến đi ở cột bên trái</div>
              <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>Hệ thống sẽ hiển thị danh sách hành khách chi tiết để bạn kiểm soát lên xe.</div>
            </div>
          )}

        </div>

      </div>

      {/* ========================================================= */}
      {/* MODAL MÁY QUÉT CAMERA QR (RESPONSIVE & KHÔNG DÙNG ICON)  */}
      {/* ========================================================= */}
      {showQRModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1100,
          padding: '1rem',
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{
            background: '#ffffff',
            width: '100%',
            maxWidth: '480px',
            borderRadius: '14px',
            padding: '1.25rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            position: 'relative',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.65rem', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>
                Quét Mã QR Vé Hành Khách
              </h3>
              <button
                onClick={() => setShowQRModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  color: '#64748b',
                  fontWeight: '700',
                  padding: '2px 8px'
                }}
              >
                Đóng
              </button>
            </div>

            {/* Vùng Camera quét */}
            <div style={{
              width: '100%',
              maxWidth: '280px',
              height: '240px',
              margin: '0 auto 1rem',
              background: '#0f172a',
              borderRadius: '10px',
              position: 'relative',
              overflow: 'hidden',
              border: cameraActive ? '2px solid #2563eb' : '2px solid #cbd5e1'
            }}>
              <div id="qr-reader" style={{ width: '100%', height: '100%' }}></div>
              
              {!cameraActive && !cameraError && (
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  background: '#0f172a', color: '#93c5fd', zIndex: 10
                }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: '700' }}>Đang khởi động camera...</span>
                </div>
              )}

              {cameraError && (
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  background: '#0f172a', color: '#f87171', padding: '1rem', textAlign: 'center', zIndex: 10
                }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '600', lineHeight: '1.4' }}>{cameraError}</span>
                </div>
              )}
            </div>

            {/* Hướng dẫn quét camera */}
            <div style={{ textAlign: 'center', marginBottom: '1rem', color: '#64748b', fontSize: '0.78rem', lineHeight: '1.4' }}>
              Hướng camera về phía mã QR trên vé xe để hệ thống tự động nhận diện và soát vé.
            </div>

            {qrVerifying ? (
              <div style={{ textAlign: 'center', padding: '0.85rem 0', fontWeight: '700', color: '#2563eb', fontSize: '0.82rem' }}>
                Đang nhận diện và xác thực mã vé...
              </div>
            ) : qrResult && (
              <div style={{
                padding: '0.85rem 1rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                background: qrResult.success ? '#f0fdf4' : '#fff1f2',
                border: qrResult.success ? '1px solid #bbf7d0' : '1px solid #fecdd3',
                color: qrResult.success ? '#15803d' : '#be123c',
                fontSize: '0.8rem'
              }}>
                <strong style={{ display: 'block', fontSize: '0.88rem', marginBottom: '3px' }}>
                  {qrResult.success ? 'Vé Hợp Lệ - Đã Xác Nhận Lên Xe' : 'Vé Không Hợp Lệ'}
                </strong>
                <div>{qrResult.message}</div>
                {qrResult.success && qrResult.booking && (
                  <div style={{ marginTop: '0.35rem', borderTop: '1px dashed #bbf7d0', paddingTop: '0.35rem', color: '#166534' }}>
                    Khách hàng: <strong>{qrResult.booking.customerName}</strong> | Ghế: <strong>{qrResult.booking.seats?.join(', ')}</strong>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              {qrResult && (
                <button
                  onClick={() => setQrResult(null)}
                  style={{
                    padding: '0.55rem 1rem',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#1e293b',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Quét Vé Tiếp Theo
                </button>
              )}
              <button
                onClick={() => setShowQRModal(false)}
                style={{
                  padding: '0.55rem 1.25rem',
                  border: 'none',
                  background: '#2563eb',
                  color: '#ffffff',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Đóng Hộp Quét
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS Reset cho Video Scanner */}
      <style>{`
        #qr-reader {
          border: none !important;
        }
        #qr-reader video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          border-radius: 8px;
        }
      `}</style>

    </div>
  );
};

export default AttendantCheckinPage;
