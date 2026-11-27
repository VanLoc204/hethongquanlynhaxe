import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import API_BASE_URL from '../../config/api';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import {
  Bot,
  User,
  Sparkles,
  RotateCcw,
  Copy,
  Check,
  PhoneCall,
  Send,
  Clock,
  Bus,
  Armchair,
  X,
  HelpCircle,
  Zap,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  Paperclip
} from 'lucide-react';
import './AIAssistantPage.css';

// Helper định dạng giờ cho thẻ chuyến xe trong chat (chỉ hiển thị chuyến sắp đi)
const formatTripCardTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');

  const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  const tmrw = new Date(now);
  tmrw.setDate(tmrw.getDate() + 1);
  const isTomorrow = d.getDate() === tmrw.getDate() && d.getMonth() === tmrw.getMonth() && d.getFullYear() === tmrw.getFullYear();

  let prefix = `${day}/${month}`;
  if (isToday) prefix = `Hôm nay ${day}/${month}`;
  else if (isTomorrow) prefix = `Ngày mai ${day}/${month}`;

  return `${prefix} • ${hours}:${mins}`;
};

// Helper định dạng văn bản tin nhắn theo dạng danh sách gạch đầu dòng gọn gàng, dễ nhìn
const renderFormattedMessageText = (text, isBot) => {
  if (!text) return null;
  const lines = text.split('\n');

  return lines.map((line, idx) => {
    // Tách và in đậm các cụm **in đậm**
    const parts = line.split(/(\*\*.*?\*\*)/g);
    const formattedLine = parts.map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={pIdx} style={{ fontWeight: '700', color: isBot ? '#0f172a' : '#ffffff' }}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });

    const trimmed = line.trim();
    const isBullet = trimmed.startsWith('•') || trimmed.startsWith('-') || /^\d+\./.test(trimmed);

    return (
      <div
        key={idx}
        style={{
          minHeight: trimmed === '' ? '8px' : 'auto',
          marginBottom: trimmed === '' ? '6px' : (isBullet ? '4px' : '3px'),
          paddingLeft: isBullet ? '6px' : '0',
          fontWeight: isBullet ? '500' : 'normal',
          lineHeight: '1.5'
        }}
      >
        {formattedLine.length > 0 ? formattedLine : '\u00A0'}
      </div>
    );
  });
};

// Helper định dạng ngày giờ khởi hành chi tiết cho Modal
const formatDepartureDateTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');

  const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  const tmrw = new Date(now);
  tmrw.setDate(tmrw.getDate() + 1);
  const isTomorrow = d.getDate() === tmrw.getDate() && d.getMonth() === tmrw.getMonth() && d.getFullYear() === tmrw.getFullYear();

  let datePrefix = `${day}/${month}/${year}`;
  if (isToday) datePrefix = `Hôm nay (${day}/${month}/${year})`;
  else if (isTomorrow) datePrefix = `Ngày mai (${day}/${month}/${year})`;

  return `${hours}:${mins} • ${datePrefix}`;
};

// Hàm dựng sơ đồ ghế chuẩn cho tất cả các loại xe (Ghế ngồi, Limousine, Giường nằm)
const getSeatLayout = (totalSeats = 16, busType = '') => {
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
      } else {
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
      } else {
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

  // Xe ghế ngồi 1 tầng
  if (totalSeats === 9) {
    lowerFloor.push(['A1', null, 'A2']);
    lowerFloor.push(['A3', null, 'A4']);
    lowerFloor.push(['A5', null, 'A6']);
    lowerFloor.push(['A7', 'A8', 'A9']);
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

  if (totalSeats === 35) {
    lowerFloor.push([null, null, null, 'A1', 'A2']);
    lowerFloor.push(['A3', 'A4', null, 'A5', 'A6']);
    lowerFloor.push(['A7', 'A8', null, 'A9', 'A10']);
    lowerFloor.push(['A11', 'A12', null, 'A13', 'A14']);
    lowerFloor.push(['A15', 'A16', null, 'A17', 'A18']);
    lowerFloor.push(['A19', 'A20', null, 'A21', 'A22']);
    lowerFloor.push(['A23', 'A24', null, 'A25', 'A26']);
    lowerFloor.push(['A27', 'A28', null, 'A29', 'A30']);
    lowerFloor.push(['A31', 'A32', 'A33', 'A34', 'A35']);
    return { lowerFloor, upperFloor: [], columns: 5 };
  }

  if (totalSeats === 45 || totalSeats === 48) {
    lowerFloor.push(['A1', 'A2', null, 'A3', 'A4']);
    lowerFloor.push(['A5', 'A6', null, 'A7', 'A8']);
    lowerFloor.push(['A9', 'A10', null, 'A11', 'A12']);
    lowerFloor.push(['A13', 'A14', null, 'A15', 'A16']);
    lowerFloor.push(['A17', 'A18', null, 'A19', 'A20']);
    lowerFloor.push(['A21', 'A22', null, 'A23', 'A24']);
    lowerFloor.push(['A25', 'A26', null, 'A27', 'A28']);
    lowerFloor.push(['A29', 'A30', null, 'A31', 'A32']);
    lowerFloor.push(['A33', 'A34', null, 'A35', 'A36']);
    lowerFloor.push(['A37', 'A38', null, 'A39', 'A40']);
    lowerFloor.push(['A41', 'A42', 'A43', 'A44', 'A45']);
    return { lowerFloor, upperFloor: [], columns: 5 };
  }

  // Fallback 4 cột
  for (let r = 1; r <= 4; r++) {
    lowerFloor.push([`A${(r - 1) * 3 + 1}`, `A${(r - 1) * 3 + 2}`, null, `A${(r - 1) * 3 + 3}`]);
  }
  return { lowerFloor, upperFloor: [], columns: 4 };
};

const AIAssistantPage = () => {
  const { user, isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const dialogueViewportRef = useRef(null);

  // ─── Booking Modal & Real-time Seat Locking State ───
  const [bookingModalTrip, setBookingModalTrip] = useState(null);
  const [modalStep, setModalStep] = useState('form'); // 'form', 'payment'
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [selectedFloor, setSelectedFloor] = useState('lower'); // 'lower', 'upper'
  const [lockedSeats, setLockedSeats] = useState({});
  const [nowTime, setNowTime] = useState(Date.now());
  const [selectedPickup, setSelectedPickup] = useState('');
  const [selectedDropoff, setSelectedDropoff] = useState('');

  // Passenger Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerBirthYear, setCustomerBirthYear] = useState('');
  const [customerCCCD, setCustomerCCCD] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [usePoints, setUsePoints] = useState(false);
  const [pointsInput, setPointsInput] = useState(0);
  const [availableVouchers, setAvailableVouchers] = useState([]);
  const [selectedVoucherCode, setSelectedVoucherCode] = useState('');
  const [createdBooking, setCreatedBooking] = useState(null);
  const [bookingError, setBookingError] = useState('');
  const [formErrors, setFormErrors] = useState({});

  // Client ID cho Real-time seat lock
  const getClientId = () => {
    let cid = sessionStorage.getItem('customer_seat_client_id');
    if (!cid) {
      cid = 'cust_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
      sessionStorage.setItem('customer_seat_client_id', cid);
    }
    return cid;
  };

  // Timer cập nhật mỗi 1 giây để đồng hồ đếm ngược chạy mượt mà
  useEffect(() => {
    const timer = setInterval(() => setNowTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Tính thời gian đếm ngược 5 phút chuẩn xác theo thời điểm hết hạn (expiresAt)
  const mySeatExpiries = selectedSeats
    .map(s => lockedSeats[s]?.expiresAt)
    .filter(exp => typeof exp === 'number' && exp > 0);

  const earliestExpiry = mySeatExpiries.length > 0 ? Math.min(...mySeatExpiries) : null;
  const remainingSeconds = (selectedSeats.length > 0 && earliestExpiry)
    ? Math.max(0, Math.ceil((earliestExpiry - nowTime) / 1000))
    : 0;

  const timerMins = Math.floor(remainingSeconds / 60);
  const timerSecs = remainingSeconds % 60;
  const formattedCountdown = `${String(timerMins).padStart(2, '0')}:${String(timerSecs).padStart(2, '0')}`;

  // Tự động giải phóng ghế khi hết 5 phút giữ chỗ
  useEffect(() => {
    if (selectedSeats.length > 0 && earliestExpiry && nowTime >= earliestExpiry) {
      alert('Đã hết thời gian 5 phút giữ chỗ! Ghế đã được tự động mở khóa.');
      if (bookingModalTrip?._id) {
        axios.post(`${API_BASE_URL}/api/trips/${bookingModalTrip._id}/unlock-all-my-seats`, {
          clientId: getClientId(),
          seats: selectedSeats
        }).catch(() => { });
      }
      setSelectedSeats([]);
    }
  }, [nowTime, earliestExpiry, selectedSeats, bookingModalTrip?._id]);

  // Giải phóng ghế khi người dùng tắt tab hoặc làm mới trang
  useEffect(() => {
    const handleUnload = () => {
      if (bookingModalTrip?._id && selectedSeats.length > 0) {
        const payload = JSON.stringify({
          clientId: getClientId(),
          seats: selectedSeats
        });
        navigator.sendBeacon?.(
          `${API_BASE_URL}/api/trips/${bookingModalTrip._id}/unlock-all-my-seats`,
          new Blob([payload], { type: 'application/json' })
        );
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [bookingModalTrip?._id, selectedSeats]);

  // Tải danh sách voucher hoạt động khi mở modal
  useEffect(() => {
    const fetchPromos = async () => {
      try {
        const res = await axios.get(API_BASE_URL + '/api/promotions');
        if (res.data && res.data.data) {
          setAvailableVouchers(res.data.data.filter(p => p.status === 'active'));
        }
      } catch (err) {
        console.warn('Lỗi tải voucher:', err);
      }
    };
    fetchPromos();
  }, []);

  // Pre-fill thông tin hành khách khi đăng nhập
  useEffect(() => {
    if (user) {
      setCustomerName(user.name || '');
      setCustomerPhone(user.phone || '');
      setCustomerEmail(user.email || '');
      if (user.birthYear) setCustomerBirthYear(String(user.birthYear));
      if (user.cccd) setCustomerCCCD(String(user.cccd));
    }
  }, [user]);

  // ─── SSE Realtime Seat Locking Connection khi Modal mở ───
  useEffect(() => {
    if (!bookingModalTrip?._id) return;

    const tripId = bookingModalTrip._id;
    const es = new EventSource(`${API_BASE_URL}/api/trips/${tripId}/seat-locks/stream`);

    // 1. Nhận danh sách ghế đang bị khóa khi vừa kết nối
    es.addEventListener('INITIAL_LOCKS', (e) => {
      try {
        const data = JSON.parse(e.data);
        const map = {};
        (data.lockedSeats || []).forEach(l => {
          map[l.seat] = { lockedBy: l.lockedBy, expiresAt: l.expiresAt };
        });
        setLockedSeats(map);
      } catch (err) { }
    });

    // 2. Nhận sự kiện khóa ghế từ bất kỳ ai (LOCK_SEAT & SEAT_LOCKED)
    const handleLockEvent = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.seat) {
          setLockedSeats(prev => ({
            ...prev,
            [data.seat]: { lockedBy: data.lockedBy, expiresAt: data.expiresAt }
          }));
        }
      } catch (err) { }
    };
    es.addEventListener('LOCK_SEAT', handleLockEvent);
    es.addEventListener('SEAT_LOCKED', handleLockEvent);

    // 3. Nhận sự kiện mở khóa ghế (UNLOCK_SEAT & SEAT_UNLOCKED)
    const handleUnlockEvent = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.seat) {
          setLockedSeats(prev => {
            const next = { ...prev };
            delete next[data.seat];
            return next;
          });
          if (data.reason === 'EXPIRED') {
            setSelectedSeats(prev => prev.filter(s => s !== data.seat));
          }
        }
      } catch (err) { }
    };
    es.addEventListener('UNLOCK_SEAT', handleUnlockEvent);
    es.addEventListener('SEAT_UNLOCKED', handleUnlockEvent);

    // 4. Nhận sự kiện ghế đã được đặt / mua thành công (BOOKED_SEATS)
    es.addEventListener('BOOKED_SEATS', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (String(data.tripId) === String(tripId) && Array.isArray(data.bookedSeats)) {
          setBookingModalTrip(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              bookedSeats: [...new Set([...(prev.bookedSeats || []), ...data.bookedSeats])]
            };
          });
          // Nếu ghế đang chọn vừa bị người khác mua thành công thì bỏ chọn
          setSelectedSeats(prev => prev.filter(s => !data.bookedSeats.includes(s)));
        }
      } catch (err) { }
    });

    // 5. Nhận sự kiện ghế được nhả ra / hủy vé (RELEASED_SEATS)
    es.addEventListener('RELEASED_SEATS', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (String(data.tripId) === String(tripId) && Array.isArray(data.releasedSeats)) {
          setBookingModalTrip(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              bookedSeats: (prev.bookedSeats || []).filter(s => !data.releasedSeats.includes(s))
            };
          });
        }
      } catch (err) { }
    });

    return () => {
      es.close();
    };
  }, [bookingModalTrip?._id]);

  // Quick suggestion prompts
  const featuredPrompts = [
    {
      title: 'Tuyến TP.HCM ➔ Đà Lạt',
      desc: 'Giờ chạy các chuyến Limousine phòng & giá vé',
      prompt: 'cho tôi biết hiện đang có chuyến xe nào đi HCM đà lạt'
    },
    {
      title: 'Đặt vé & Chọn chỗ online',
      desc: 'Các bước chọn tuyến xe, số ghế và thanh toán an toàn',
      prompt: 'Làm sao để đặt vé xe và chọn vị trí ghế ngồi trực tuyến?'
    },
    {
      title: 'Chính sách hoàn / đổi vé',
      desc: 'Hủy trước 5 ngày, hoàn 100% thành điểm tích lũy',
      prompt: 'Chính sách hoàn hủy vé của An Bình Lines như thế nào?'
    },
    {
      title: 'Tích lũy điểm thành viên',
      desc: 'Cách tích điểm và dùng điểm thưởng giảm tiền trực tiếp',
      prompt: 'Làm sao để tích lũy điểm và dùng điểm thưởng khi đặt vé?'
    }
  ];

  const quickInputChips = [
    'Tuyến Sài Gòn ➔ Đà Lạt',
    'Cách đặt vé online',
    'Hủy vé hoàn 100% điểm',
    'Tích điểm thưởng',
    'Tra cứu vé đã đặt'
  ];

  // Khởi tạo tin nhắn chào mừng
  useEffect(() => {
    const saved = sessionStorage.getItem('assistant_page_messages');
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch {
        initWelcomeMessage();
      }
    } else {
      initWelcomeMessage();
    }
  }, [user]);

  const initWelcomeMessage = () => {
    const welcome = {
      id: 'welcome',
      sender: 'bot',
      text: `Xin chào ${user?.name || 'Hồ Văn Lộc'}! Tôi là Trợ lý ảo An Bình AI. Tôi có thể hỗ trợ quý khách tra cứu lịch trình xuất bến, giá vé xe Limousine cao cấp, hướng dẫn đặt vé chọn ghế và chính sách vé An Bình. Quý khách cần hỗ trợ thông tin gì hôm nay?`,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };
    setMessages([welcome]);
    sessionStorage.setItem('assistant_page_messages', JSON.stringify([welcome]));
  };

  useEffect(() => {
    if (dialogueViewportRef.current) {
      dialogueViewportRef.current.scrollTo({
        top: dialogueViewportRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isTyping]);

  const handleCopyMessage = (id, text) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleClearChat = () => {
    if (window.confirm('Bạn có chắc chắn muốn làm mới toàn bộ cuộc trò chuyện này không?')) {
      sessionStorage.removeItem('assistant_page_messages');
      initWelcomeMessage();
    }
  };

  // ─── Gửi tin nhắn & Xử lý phản hồi thông minh từ Gemini AI kèm Thẻ Đặt Vé Trực Tiếp ───
  const handleSendMessage = async (textToSend) => {
    if (!textToSend.trim() || isTyping) return;

    const userMsg = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    sessionStorage.setItem('assistant_page_messages', JSON.stringify(nextMessages));
    setInputValue('');
    setIsTyping(true);

    try {
      // 1. Quản lý Session ID của phiên hội thoại
      let sessionId = sessionStorage.getItem('ai_assistant_session_id');
      if (!sessionId) {
        sessionId = 'sess_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
        sessionStorage.setItem('ai_assistant_session_id', sessionId);
      }

      // 2. Định dạng lịch sử hội thoại gần nhất để gửi cho Gemini (bỏ qua tin chào mừng ban đầu)
      const historyPayload = messages
        .filter(m => m.id !== 'welcome')
        .slice(-8)
        .map(m => ({
          sender: m.sender === 'user' ? 'user' : 'assistant',
          text: m.text
        }));

      // 3. Gọi Backend Gemini AI Chat API
      const res = await axios.post(API_BASE_URL + '/api/chat', {
        message: textToSend.trim(),
        sessionId,
        history: historyPayload
      });

      const replyText = res.data?.text || 'Dạ, An Bình AI luôn sẵn sàng hỗ trợ quý khách!';
      const rawCards = res.data?.tripCards || [];

      // 4. Định dạng thẻ chuyến xe (nếu AI có đề xuất chuyến cụ thể)
      const tripCards = rawCards.map(t => {
        const raw = t.rawTrip || t;
        const totalSeats = raw.busId?.totalSeats || t.busId?.totalSeats || 29;
        const bookedCount = (raw.bookedSeats || []).length;
        const remaining = Math.max(0, totalSeats - bookedCount);
        return {
          _id: t._id || raw._id,
          time: formatTripCardTime(t.departureTime || raw.departureTime),
          busType: raw.busId?.type || t.busType || 'Xe Limousine cao cấp',
          price: t.price || raw.price || 220000,
          priceFormatted: `${(t.price || raw.price || 220000).toLocaleString('vi-VN')} đ`,
          seatsAvailable: remaining > 0 ? `Còn ${remaining} chỗ trống` : 'Hết chỗ',
          rawTrip: raw
        };
      });

      const botReply = {
        id: `bot_${Date.now()}`,
        sender: 'bot',
        text: replyText,
        tripCards: tripCards.length > 0 ? tripCards : undefined,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      };

      const finalMsgs = [...nextMessages, botReply];
      setMessages(finalMsgs);
      sessionStorage.setItem('assistant_page_messages', JSON.stringify(finalMsgs));

    } catch (err) {
      console.error('Lỗi gọi AI Chatbot:', err);
      const fallbackReply = {
        id: `bot_${Date.now()}`,
        sender: 'bot',
        text: 'Dạ, hiện tại đường truyền đến hệ thống AI đang bảo trì. Quý khách vui lòng thử lại sau giây lát hoặc liên hệ tổng đài CSKH 1900 6067 để được hỗ trợ tức thì nhé!',
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      };
      const finalMsgs = [...nextMessages, fallbackReply];
      setMessages(finalMsgs);
      sessionStorage.setItem('assistant_page_messages', JSON.stringify(finalMsgs));
    } finally {
      setIsTyping(false);
    }
  };

  // ─── Xử lý mở Modal Đặt Vé Nhanh Trong Chat (Gắn chặt với chuyến xe được chọn) ───
  const handleOpenBookingModal = async (tripItem) => {
    let tripData = tripItem.rawTrip || tripItem;
    const tripId = tripData?._id || tripItem?._id;

    // 1. Luôn tải thông tin chuyến xe mới nhất từ server (đảm bảo bookedSeats chuẩn xác 100% thời gian thực)
    try {
      const res = await axios.get(`${API_BASE_URL}/api/trips/${tripId}`);
      if (res.data?.trip) {
        tripData = res.data.trip;
      }
    } catch (err) {
      console.warn('Lỗi lấy chuyến mới nhất:', err);
    }

    // 2. Tải ngay các ghế đang bị khóa thời gian thực từ server
    try {
      const lockRes = await axios.get(`${API_BASE_URL}/api/trips/${tripId}/locked-seats`);
      if (lockRes.data?.success && Array.isArray(lockRes.data.lockedSeats)) {
        const map = {};
        lockRes.data.lockedSeats.forEach(l => {
          map[l.seat] = { lockedBy: l.lockedBy, expiresAt: l.expiresAt };
        });
        setLockedSeats(map);
      }
    } catch (err) {
      console.warn('Lỗi lấy danh sách ghế đang khóa:', err);
    }

    setBookingModalTrip(tripData);
    setSelectedSeats([]);
    setSelectedFloor('lower');
    setModalStep('form');
    setBookingError('');
    const firstPickup = (tripData.pickupPoints && tripData.pickupPoints.length > 0)
      ? (tripData.pickupPoints[0].location || tripData.pickupPoints[0].name || tripData.pickupPoints[0].address)
      : (tripData.routeId?.startPoint || 'Bến Xe Miền Tây');
    const firstDropoff = (tripData.dropoffPoints && tripData.dropoffPoints.length > 0)
      ? (tripData.dropoffPoints[0].location || tripData.dropoffPoints[0].name || tripData.dropoffPoints[0].address)
      : (tripData.routeId?.endPoint || 'Bến Xe Liên Tỉnh Đà Lạt');
    setSelectedPickup(firstPickup);
    setSelectedDropoff(firstDropoff);
  };

  // Đóng Modal và hủy giữ chỗ
  const handleCloseBookingModal = async () => {
    if (bookingModalTrip && selectedSeats.length > 0) {
      try {
        await axios.post(`${API_BASE_URL}/api/trips/${bookingModalTrip._id}/unlock-all-my-seats`, {
          clientId: getClientId(),
          seats: selectedSeats
        });
      } catch (e) { }
    }
    setBookingModalTrip(null);
    setSelectedSeats([]);
    setSelectedFloor('lower');
    setModalStep('form');
  };

  // Thao tác chọn / hủy chọn ghế Realtime
  const handleSeatClick = async (seatCode) => {
    if (!bookingModalTrip) return;
    const isBooked = (bookingModalTrip.bookedSeats || []).includes(seatCode);
    if (isBooked) return;

    const lockInfo = lockedSeats[seatCode];
    const myClientId = getClientId();
    const isLockedByOther = lockInfo && lockInfo.lockedBy !== myClientId && lockInfo.expiresAt > Date.now();
    if (isLockedByOther) {
      const remainingSec = Math.max(1, Math.round((lockInfo.expiresAt - Date.now()) / 1000));
      alert(`Ghế ${seatCode} đang được khách hàng khác giữ chỗ (còn ${remainingSec} giây).`);
      return;
    }

    const isSelected = selectedSeats.includes(seatCode);
    if (isSelected) {
      // Mở khóa ghế
      try {
        await axios.post(`${API_BASE_URL}/api/trips/${bookingModalTrip._id}/unlock-seat`, {
          seat: seatCode,
          clientId: myClientId
        });
      } catch (e) { }
      setSelectedSeats(prev => prev.filter(s => s !== seatCode));
      setLockedSeats(prev => {
        const next = { ...prev };
        delete next[seatCode];
        return next;
      });
    } else {
      // Khóa giữ chỗ ghế 5 phút
      try {
        const res = await axios.post(`${API_BASE_URL}/api/trips/${bookingModalTrip._id}/lock-seat`, {
          seat: seatCode,
          clientId: myClientId
        });
        if (res.data?.success) {
          const expiresAt = res.data.expiresAt || (Date.now() + 300000);
          setSelectedSeats(prev => [...prev, seatCode]);
          setLockedSeats(prev => ({
            ...prev,
            [seatCode]: { lockedBy: myClientId, expiresAt }
          }));
        } else {
          alert(res.data?.message || `Ghế ${seatCode} đã bị người khác chọn.`);
        }
      } catch (err) {
        alert(err.response?.data?.message || `Ghế ${seatCode} không khả dụng.`);
      }
    }
  };

  // Tính toán số tiền trong Modal
  const pricePerSeat = bookingModalTrip?.price || 220000;
  const originalBookingAmount = pricePerSeat * selectedSeats.length;

  const isGuest = !isAuthenticated || !user;
  const appliedPromo = (!isGuest && availableVouchers) ? availableVouchers.find(v => v.code === selectedVoucherCode) : null;
  let voucherDiscountAmount = 0;
  if (!isGuest && appliedPromo && originalBookingAmount > 0) {
    if (!appliedPromo.minOrderValue || originalBookingAmount >= appliedPromo.minOrderValue) {
      if (appliedPromo.discountType === 'percentage') {
        voucherDiscountAmount = Math.round((originalBookingAmount * appliedPromo.discountValue) / 100);
        if (appliedPromo.maxDiscountAmount > 0) {
          voucherDiscountAmount = Math.min(voucherDiscountAmount, appliedPromo.maxDiscountAmount);
        }
      } else {
        voucherDiscountAmount = Math.min(originalBookingAmount, appliedPromo.discountValue || 0);
      }
    }
  }

  const amountAfterVoucher = Math.max(0, originalBookingAmount - voucherDiscountAmount);
  const maxPointsCanUse = !isGuest ? Math.min(user?.points || 0, amountAfterVoucher) : 0;
  const pointsDiscountAmount = (!isGuest && usePoints) ? Math.min(Number(pointsInput) || 0, maxPointsCanUse) : 0;
  const totalPayAmount = Math.max(0, amountAfterVoucher - pointsDiscountAmount);

  // Xác nhận tạo booking
  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    setBookingError('');
    setFormErrors({});

    if (selectedSeats.length === 0) {
      setBookingError('Vui lòng chọn ít nhất 1 vị trí ghế trên sơ đồ.');
      return;
    }

    const errs = {};
    const nameTrimmed = (customerName || '').trim();
    const phoneTrimmed = (customerPhone || '').trim();
    const birthYearVal = (customerBirthYear || '').toString().trim();
    const cccdTrimmed = (customerCCCD || '').trim();

    // 1. Họ và tên
    if (!nameTrimmed) {
      errs.customerName = 'Vui lòng nhập họ và tên.';
    } else if (nameTrimmed.length < 2) {
      errs.customerName = 'Họ và tên tối thiểu 2 ký tự.';
    } else if (nameTrimmed.length > 50) {
      errs.customerName = 'Họ và tên không quá 50 ký tự.';
    } else if (!/^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăạảấầẩẫậắằẳẵặẹẻẽềềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵỷỹ\s]+$/.test(nameTrimmed)) {
      errs.customerName = 'Họ và tên chỉ được chứa chữ cái.';
    }

    // 2. Số điện thoại
    if (!phoneTrimmed) {
      errs.customerPhone = 'Vui lòng nhập số điện thoại.';
    } else if (!/^\d+$/.test(phoneTrimmed)) {
      errs.customerPhone = 'Số điện thoại chỉ gồm các chữ số.';
    } else if (!phoneTrimmed.startsWith('0')) {
      errs.customerPhone = 'Số điện thoại phải bắt đầu bằng số 0.';
    } else if (phoneTrimmed.length !== 10) {
      errs.customerPhone = 'Số điện thoại phải có đúng 10 chữ số.';
    } else if (!/^0(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/.test(phoneTrimmed)) {
      errs.customerPhone = 'Đầu số điện thoại không hợp lệ.';
    }

    // 3. Năm sinh
    const currentYear = new Date().getFullYear();
    const yearNum = Number(birthYearVal);
    if (!birthYearVal) {
      errs.customerBirthYear = 'Vui lòng nhập năm sinh.';
    } else if (!/^\d{4}$/.test(birthYearVal) || isNaN(yearNum) || yearNum < 1920 || yearNum > currentYear) {
      errs.customerBirthYear = 'Năm sinh không hợp lệ.';
    }

    // 4. Số CCCD
    if (!cccdTrimmed) {
      errs.customerCCCD = 'Vui lòng nhập số CCCD.';
    } else if (!/^\d+$/.test(cccdTrimmed)) {
      errs.customerCCCD = 'Số CCCD chỉ gồm các chữ số.';
    } else if (cccdTrimmed.length !== 12) {
      errs.customerCCCD = 'Số CCCD phải gồm đúng 12 chữ số.';
    }

    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }

    try {
      const res = await axios.post(API_BASE_URL + '/api/trips/book', {
        tripId: bookingModalTrip._id,
        userId: isGuest ? 'user_guest' : (user?.id || user?._id || 'user_guest'),
        seats: selectedSeats,
        pickup: selectedPickup,
        dropoff: selectedDropoff,
        customerName: nameTrimmed,
        customerPhone: phoneTrimmed,
        customerBirthYear: yearNum,
        customerCCCD: cccdTrimmed,
        customerEmail,
        paymentType: 'immediate',
        pointsUsed: isGuest ? 0 : pointsDiscountAmount,
        voucherCode: isGuest ? '' : (selectedVoucherCode || '')
      });

      if (res.data?.success) {
        setCreatedBooking({ ...res.data.booking, payosData: res.data.payosData });
        setModalStep('payment');
      } else {
        setBookingError(res.data?.message || 'Lỗi khi tạo đơn đặt vé.');
      }
    } catch (err) {
      setBookingError(err.response?.data?.message || 'Có lỗi xảy ra khi tạo vé.');
    }
  };

  // Tự động kiểm tra trạng thái thanh toán (polling mỗi 2s) khi modal QR đang mở
  useEffect(() => {
    if (modalStep !== 'payment' || !createdBooking?.orderCode) return;

    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/bookings/order/${createdBooking.orderCode}`);
        if (res.data?.success && res.data.booking?.status === 'paid') {
          clearInterval(interval);
          const routeText = bookingModalTrip?.routeId?.name || (bookingModalTrip?.routeId?.startPoint ? `${bookingModalTrip.routeId.startPoint} ➔ ${bookingModalTrip.routeId.endPoint}` : 'TP.HCM ➔ Đà Lạt');
          const departureTimeText = bookingModalTrip?.departureTime ? formatDepartureDateTime(bookingModalTrip.departureTime) : '';
          const confirmBotMsg = {
            id: `bot_booked_${Date.now()}`,
            sender: 'bot',
            text: `🎉 Chúc mừng ${customerName}! Đã nhận thanh toán thành công qua VietQR cho mã vé #${createdBooking.orderCode}. Tuyến: ${routeText} ${departureTimeText ? `| Khởi hành: ${departureTimeText}` : ''} | Ghế: ${selectedSeats.join(', ')} | Số tiền: ${createdBooking.totalAmount?.toLocaleString('vi-VN')} đ. Quý khách có thể xem vé tại mục Quản lý vé!`,
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
          };

          setMessages(prev => {
            const nextList = [...prev, confirmBotMsg];
            sessionStorage.setItem('assistant_page_messages', JSON.stringify(nextList));
            return nextList;
          });

          handleCloseBookingModal();
        }
      } catch (err) {
        // Bỏ qua lỗi kết nối polling
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [modalStep, createdBooking, bookingModalTrip, customerName, selectedSeats]);

  // Giả lập thanh toán PayOS thành công
  const handleSimulatePayment = async () => {
    if (!createdBooking) return;
    try {
      await axios.post(API_BASE_URL + '/api/trips/payment/webhook', {
        code: '00',
        desc: 'success',
        data: {
          orderCode: createdBooking.orderCode,
          amount: createdBooking.totalAmount
        }
      });

      // Thêm tin nhắn xác nhận thành công vào đoạn chat
      const routeText = bookingModalTrip.routeId?.name || (bookingModalTrip.routeId?.startPoint ? `${bookingModalTrip.routeId.startPoint} ➔ ${bookingModalTrip.routeId.endPoint}` : 'TP.HCM ➔ Đà Lạt');
      const departureTimeText = bookingModalTrip.departureTime ? formatDepartureDateTime(bookingModalTrip.departureTime) : '';
      const confirmBotMsg = {
        id: `bot_booked_${Date.now()}`,
        sender: 'bot',
        text: `🎉 Chúc mừng ${customerName}! Đã đặt vé thành công mã vé #${createdBooking.orderCode}. Tuyến: ${routeText} ${departureTimeText ? `| Khởi hành: ${departureTimeText}` : ''} | Ghế: ${selectedSeats.join(', ')} | Số tiền: ${createdBooking.totalAmount?.toLocaleString('vi-VN')} đ. Quý khách có thể xem vé tại mục Quản lý vé!`,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      };

      const nextList = [...messages, confirmBotMsg];
      setMessages(nextList);
      sessionStorage.setItem('assistant_page_messages', JSON.stringify(nextList));

      handleCloseBookingModal();
    } catch (err) {
      alert('Lỗi kích hoạt webhook thanh toán: ' + (err.response?.data?.message || err.message));
    }
  };

  // Sơ đồ ghế chuẩn theo từng loại xe (hỗ trợ xe 1 tầng và xe 2 tầng, có lối đi giữa)
  const seatLayoutData = useMemo(() => {
    if (!bookingModalTrip) {
      return getSeatLayout(16, '');
    }
    const bus = bookingModalTrip.busId;
    if (bus?.seatLayout && Array.isArray(bus.seatLayout.lowerFloor) && bus.seatLayout.lowerFloor.length > 0) {
      return bus.seatLayout;
    }
    return getSeatLayout(bus?.totalSeats || bookingModalTrip.totalSeats || 16, bus?.type || '');
  }, [bookingModalTrip]);

  const hasUpperFloor = seatLayoutData.upperFloor && seatLayoutData.upperFloor.length > 0;
  const activeFloor = (selectedFloor === 'upper' && hasUpperFloor) ? 'upper' : 'lower';
  const currentFloorRows = activeFloor === 'lower' ? seatLayoutData.lowerFloor : seatLayoutData.upperFloor;
  const layoutColumns = seatLayoutData.columns || 4;

  return (
    <div className="ai-page-wrapper">

      {/* ─── 1. Header Top Bar (Gọn gàng ~50px, KHÔNG v2.4vip, KHÔNG badge hệ thống vé) ─── */}
      <div className="ai-top-header">
        <div className="ai-header-left">
          <div className="ai-header-icon">
            <Sparkles size={20} />
          </div>
          <div>
            <h2 className="ai-header-title">Trợ Lý Tư Vấn Tuyến Đường & Dịch Vụ AI</h2>
            <p className="ai-header-subtitle">
              Hỏi đáp tức thì về lịch trình xuất bến, giá vé xe Limousine cao cấp, hướng dẫn đặt vé chọn ghế và chính sách vé An Bình.
            </p>
          </div>
        </div>
      </div>

      {/* ─── 2. Main 2-Column Layout ─── */}
      <div className="ai-main-layout">

        {/* ══════════ CỘT TRÁI: KHUNG TRÒ CHUYỆN AI (~68%) ══════════ */}
        <main className="ai-chat-console">

          {/* Header trong khung Chat */}
          <div className="ai-chat-header">
            <div className="ai-agent-info">
              <div className="ai-agent-avatar">
                <Bot size={20} />
              </div>
              <div>
                <h3 className="ai-agent-name">Trợ Lý Ảo An Bình AI</h3>
                <span className="ai-agent-status">
                  <span className="ai-online-dot" />
                  Đang trực tuyến • Phản hồi tức thì
                </span>
              </div>
            </div>

            <button
              type="button"
              className="btn-ai-refresh"
              onClick={handleClearChat}
              title="Làm mới cuộc trò chuyện"
            >
              <RotateCcw size={13} />
              <span>Làm Mới</span>
            </button>
          </div>

          {/* Vùng tin nhắn (Cuộn nội bộ, không tràn trang ngoài) */}
          <div className="ai-dialogue-viewport" ref={dialogueViewportRef}>
            {messages.map((msg) => {
              const isBot = msg.sender === 'bot';
              const isCopied = copiedId === msg.id;

              return (
                <div key={msg.id} className={`ai-msg-row ${isBot ? 'is-bot' : 'is-user'}`}>
                  <div className={`ai-msg-avatar ${isBot ? 'bot' : 'user'}`}>
                    {isBot ? <Bot size={16} /> : <User size={16} />}
                  </div>

                  <div className="ai-msg-content">
                    <div className="ai-msg-bubble">
                      <div>{renderFormattedMessageText(msg.text, isBot)}</div>

                      {/* Hiển thị thẻ chuyến xe tương tác nếu có (mỗi chuyến xe là 1 thẻ độc lập) */}
                      {msg.tripCards && msg.tripCards.length > 0 && (
                        <div className="ai-trip-cards-wrapper">
                          {msg.tripCards.map((tc) => (
                            <div
                              key={tc._id}
                              className="ai-trip-card-item"
                              onClick={() => handleOpenBookingModal(tc.rawTrip || tc)}
                              title="Nhấp để chọn chuyến xe này"
                            >
                              <div className="ai-trip-info-left">
                                <div className="ai-trip-icon-box">
                                  <Clock size={16} />
                                </div>
                                <div>
                                  <div className="ai-trip-time-title">{tc.time}</div>
                                  <div className="ai-trip-bus-sub">{tc.busType}</div>
                                </div>
                              </div>

                              <div className="ai-trip-info-right">
                                <div className="ai-trip-price-block">
                                  <div className="ai-trip-price-range">
                                    {tc.priceFormatted || (tc.price ? `${tc.price.toLocaleString('vi-VN')} đ` : tc.priceRange)}
                                  </div>
                                  <div className="ai-trip-seats-badge">{tc.seatsAvailable}</div>
                                </div>
                                <button
                                  type="button"
                                  className="btn-select-trip"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenBookingModal(tc.rawTrip || tc);
                                  }}
                                  title="Đặt vé chuyến xe này"
                                >
                                  <Armchair size={13} />
                                  Chọn chuyến
                                </button>
                              </div>
                            </div>
                          ))}

                          <div className="ai-trip-helper-text">
                            💡 Quý khách nhấp trực tiếp vào chuyến xe hoặc nút "Chọn chuyến" để chọn ghế và đặt vé ngay.
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="ai-msg-meta">
                      <span>{msg.time}</span>
                      {isBot && (
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(msg.id, msg.text)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#94a3b8',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontSize: '0.67rem',
                            padding: '0 4px'
                          }}
                          title="Sao chép nội dung"
                        >
                          {isCopied ? <Check size={11} color="#10b981" /> : <Copy size={11} />}
                          <span>{isCopied ? 'Đã sao chép' : 'Sao chép'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="ai-msg-row is-bot">
                <div className="ai-msg-avatar bot">
                  <Bot size={16} />
                </div>
                <div className="ai-typing-bubble">
                  <span className="ai-typing-dot" />
                  <span className="ai-typing-dot" />
                  <span className="ai-typing-dot" />
                  <span style={{ fontSize: '0.74rem', color: '#64748b', marginLeft: '6px', fontWeight: '600' }}>
                    AI đang soạn câu trả lời...
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Thanh nhập liệu & Gợi ý nhanh */}
          <div className="ai-chat-footer">

            {/* Quick Chips */}
            <div className="ai-quick-strip">
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '800', flexShrink: 0 }}>
                Gợi ý nhanh:
              </span>
              {quickInputChips.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="ai-strip-btn"
                  onClick={() => handleSendMessage(chip)}
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Input Form Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputValue);
              }}
              className="ai-input-form"
            >
              <Sparkles size={16} style={{ color: '#2563eb', flexShrink: 0 }} />
              <input
                type="text"
                className="ai-input-field"
                placeholder="Nhập câu hỏi về lịch trình, giá vé xe, đổi trả vé, điểm thưởng..."
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
              />
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                title="Đính kèm"
              >
                <Paperclip size={15} />
              </button>
              <button
                type="submit"
                className="btn-ai-send"
                disabled={!inputValue.trim() || isTyping}
                title="Gửi câu hỏi"
              >
                <Send size={14} />
              </button>
            </form>

            <div className="ai-footer-note">
              <span>An Bình AI tự động cập nhật biểu đồ giá vé và tuyến đường chính thức năm 2026.</span>
              <span style={{ color: '#64748b' }}>Nhấn Enter để gửi tin nhắn</span>
            </div>
          </div>
        </main>

        {/* ══════════ CỘT PHẢI: SIDEBAR HUB (~32%) ══════════ */}
        <aside className="ai-sidebar">

          {/* Card 1: Câu Hỏi Thường Gặp */}
          <div className="ai-sidecard">
            <div className="ai-sidecard-header">
              <h4 className="ai-sidecard-title">
                <HelpCircle size={15} style={{ color: '#2563eb' }} />
                <span>Câu Hỏi Thường Gặp</span>
              </h4>
              <span className="ai-sidecard-badge">Bấm để hỏi nhanh</span>
            </div>

            <div className="ai-prompts-list">
              {featuredPrompts.map((p, idx) => (
                <div
                  key={idx}
                  className="ai-prompt-item"
                  onClick={() => handleSendMessage(p.prompt)}
                >
                  <div>
                    <div className="ai-prompt-title">{p.title}</div>
                    <div className="ai-prompt-desc">{p.desc}</div>
                  </div>
                  <span className="ai-prompt-arrow">&gt;</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Khả Năng Nổi Bật Của AI */}
          <div className="ai-sidecard">
            <div className="ai-sidecard-header">
              <h4 className="ai-sidecard-title">
                <Zap size={15} style={{ color: '#0284c7' }} />
                <span>Khả Năng Nổi Bật Của AI</span>
              </h4>
            </div>

            <div className="ai-caps-list">
              <div className="ai-cap-row">
                <div className="ai-cap-icon-box">
                  <Bus size={13} />
                </div>
                <div>
                  <div className="ai-cap-title">Tra cứu xuất bến Limousine</div>
                  <div className="ai-cap-desc">Cập nhật vị trí và giờ xe khởi hành chuẩn xác theo GPS thời gian thực.</div>
                </div>
              </div>

              <div className="ai-cap-row">
                <div className="ai-cap-icon-box">
                  <ShieldCheck size={13} />
                </div>
                <div>
                  <div className="ai-cap-title">Giữ chỗ & Thanh toán tức thì</div>
                  <div className="ai-cap-desc">Hỗ trợ chọn số ghế, khóa ghế 5 phút và liên kết thanh toán VietQR PayOS bảo mật cao.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Hotline Support Card */}
          <div className="ai-hotline-card">
            <div>
              <div className="ai-hotline-header">
                <PhoneCall size={16} style={{ color: '#fed7aa' }} />
                <span>Cần Hỗ Trợ Gặp Nhân Viên?</span>
              </div>
              <p className="ai-hotline-desc">
                Tổng đài viên An Bình Lines túc trực 24/7 để giải quyết các trường hợp thay đổi thông tin hành khách hoặc đón xe gấp.
              </p>
            </div>
            <a href="tel:19006067" className="ai-hotline-btn">
              <PhoneCall size={14} />
              <span>Gọi Ngay 1900 6067</span>
            </a>
          </div>

        </aside>

      </div>

      {/* ─── 3. In-Chat Quick Booking Modal (Real-Time Seat Locking 5 Phút) ─── */}
      {bookingModalTrip && (
        <div className="ai-modal-overlay animate-fade-in" onClick={handleCloseBookingModal}>
          <div className="ai-modal-container" onClick={e => e.stopPropagation()}>

            {/* Header Modal */}
            <div className="ai-modal-header">
              <div className="ai-modal-title-row">
                <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: '#eff6ff', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Armchair size={15} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: '800', color: '#0f172a' }}>
                    Đặt Vé Nhanh Qua Trợ Lý AI
                  </h3>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Tuyến xe: {bookingModalTrip.routeId?.name || (bookingModalTrip.routeId?.startPoint ? `${bookingModalTrip.routeId.startPoint} ➔ ${bookingModalTrip.routeId.endPoint}` : 'TP.HCM ➔ Đà Lạt')} | Khởi hành: {bookingModalTrip.departureTime ? formatDepartureDateTime(bookingModalTrip.departureTime) : 'Sắp xuất bến'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {selectedSeats.length > 0 && (
                  <span className="ai-modal-timer-badge">
                    <Clock size={12} />
                    Giữ chỗ: {formattedCountdown}
                  </span>
                )}
                <button
                  type="button"
                  className="btn-ai-modal-close"
                  onClick={handleCloseBookingModal}
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            {modalStep === 'form' ? (
              <div className="ai-modal-body">

                {/* Cột 1: Sơ đồ chọn ghế Realtime chuẩn phong cách An Bình */}
                <div className="ai-seat-grid-box">
                  <div className="ai-seat-card-wrapper">
                    <div className="ai-seat-header-row">
                      <div className="ai-seat-title">
                        Sơ Đồ Ghế Ngồi {hasUpperFloor ? `(${activeFloor === 'lower' ? 'Tầng Dưới' : 'Tầng Trên'})` : ''}
                      </div>
                      <div className="ai-seat-selected-badge">
                        Đã chọn: {selectedSeats.length > 0 ? selectedSeats.join(', ') : 'Chưa chọn'}
                      </div>
                    </div>

                    {/* Bộ chuyển tầng nếu xe 2 tầng */}
                    {hasUpperFloor && (
                      <div className="ai-floor-tabs">
                        <button
                          type="button"
                          className={`ai-floor-tab-btn ${activeFloor === 'lower' ? 'active' : ''}`}
                          onClick={() => setSelectedFloor('lower')}
                        >
                          Tầng Dưới (Tầng 1)
                        </button>
                        <button
                          type="button"
                          className={`ai-floor-tab-btn ${activeFloor === 'upper' ? 'active' : ''}`}
                          onClick={() => setSelectedFloor('upper')}
                        >
                          Tầng Trên (Tầng 2)
                        </button>
                      </div>
                    )}

                    {/* Lưới ghế thực tế chuẩn từng loại xe có lối đi (Aisle) */}
                    <div
                      className="ai-seat-bus-frame"
                      style={{
                        gridTemplateColumns: `repeat(${layoutColumns}, 1fr)`
                      }}
                    >
                      {currentFloorRows.flat().map((seatCode, idx) => {
                        if (seatCode === null) {
                          return <div key={`aisle-${idx}`} className="ai-seat-aisle" />;
                        }

                        const isBooked = (bookingModalTrip.bookedSeats || []).includes(seatCode);
                        const isSelected = selectedSeats.includes(seatCode);
                        const myClientId = getClientId();
                        const lockInfo = lockedSeats[seatCode];
                        const isLockedByOther = !isBooked && !isSelected && lockInfo && lockInfo.lockedBy !== myClientId && lockInfo.expiresAt > nowTime;

                        let btnClass = 'ai-seat-btn';
                        let seatTitle = `Ghế ${seatCode}`;
                        if (isBooked) {
                          btnClass += ' is-booked';
                          seatTitle = `Ghế ${seatCode} (Đã bán)`;
                        } else if (isLockedByOther) {
                          btnClass += ' is-locked';
                          const remainingSec = Math.max(1, Math.round((lockInfo.expiresAt - nowTime) / 1000));
                          seatTitle = `Ghế ${seatCode} (Đang được giữ chỗ 5p - còn ${remainingSec}s)`;
                        } else if (isSelected) {
                          btnClass += ' is-selected';
                          seatTitle = `Ghế ${seatCode} (Đang chọn - giữ chỗ 5 phút)`;
                        }

                        return (
                          <button
                            key={seatCode}
                            type="button"
                            className={btnClass}
                            disabled={isBooked || isLockedByOther}
                            onClick={() => handleSeatClick(seatCode)}
                            title={seatTitle}
                          >
                            <span>{seatCode}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Chú thích màu sắc ghế chuẩn */}
                    <div className="ai-seat-legend">
                      <div className="ai-legend-item">
                        <span className="ai-legend-sample is-available" />
                        <span>Trống</span>
                      </div>
                      <div className="ai-legend-item">
                        <span className="ai-legend-sample is-selected" />
                        <span>Đang chọn</span>
                      </div>
                      <div className="ai-legend-item">
                        <span className="ai-legend-sample is-locked" />
                        <span>Khóa 5p</span>
                      </div>
                      <div className="ai-legend-item">
                        <span className="ai-legend-sample is-booked" />
                        <span>Đã bán</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cột 2: Thông tin hành khách & Điểm đón trả */}
                <form onSubmit={handleConfirmBooking} noValidate className="ai-modal-form">
                  {bookingError && (
                    <div style={{ padding: '6px 8px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#dc2626', fontSize: '0.72rem', fontWeight: '500' }}>
                      {bookingError}
                    </div>
                  )}

                  <div className="ai-form-row">
                    <label className="ai-form-label">Điểm đón khách</label>
                    <select
                      className="ai-form-select"
                      value={selectedPickup}
                      onChange={e => setSelectedPickup(e.target.value)}
                    >
                      {((bookingModalTrip.pickupPoints && bookingModalTrip.pickupPoints.length > 0)
                        ? bookingModalTrip.pickupPoints
                        : [{ location: bookingModalTrip?.routeId?.startPoint || 'Bến Xe Miền Tây' }]
                      ).map((p, idx) => {
                        const loc = p.location || p.name || p.address || 'Điểm đón';
                        const time = p.time ? `${p.time} - ` : '';
                        return (
                          <option key={idx} value={loc}>
                            {time}{loc}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="ai-form-row">
                    <label className="ai-form-label">Điểm trả khách</label>
                    <select
                      className="ai-form-select"
                      value={selectedDropoff}
                      onChange={e => setSelectedDropoff(e.target.value)}
                    >
                      {((bookingModalTrip.dropoffPoints && bookingModalTrip.dropoffPoints.length > 0)
                        ? bookingModalTrip.dropoffPoints
                        : [{ location: bookingModalTrip?.routeId?.endPoint || 'Bến Xe Liên Tỉnh Đà Lạt' }]
                      ).map((p, idx) => {
                        const loc = p.location || p.name || p.address || 'Điểm trả';
                        const time = p.time ? `${p.time} - ` : '';
                        return (
                          <option key={idx} value={loc}>
                            {time}{loc}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div className="ai-form-row">
                      <label className="ai-form-label">Họ tên hành khách <span style={{ color: '#dc2626' }}>*</span></label>
                      <input
                        type="text"
                        className="ai-form-input"
                        placeholder="Nhập họ và tên"
                        value={customerName}
                        onChange={e => {
                          setCustomerName(e.target.value);
                          if (formErrors.customerName) setFormErrors(prev => ({ ...prev, customerName: '' }));
                        }}
                        style={{
                          borderColor: formErrors.customerName ? '#dc2626' : undefined,
                          backgroundColor: formErrors.customerName ? '#fff5f5' : undefined
                        }}
                      />
                      {formErrors.customerName && (
                        <div style={{ color: '#dc2626', fontSize: '0.72rem', marginTop: '3px', fontWeight: '500' }}>
                          {formErrors.customerName}
                        </div>
                      )}
                    </div>
                    <div className="ai-form-row">
                      <label className="ai-form-label">Số điện thoại <span style={{ color: '#dc2626' }}>*</span></label>
                      <input
                        type="tel"
                        className="ai-form-input"
                        placeholder="Nhập số điện thoại"
                        value={customerPhone}
                        onChange={e => {
                          setCustomerPhone(e.target.value);
                          if (formErrors.customerPhone) setFormErrors(prev => ({ ...prev, customerPhone: '' }));
                        }}
                        style={{
                          borderColor: formErrors.customerPhone ? '#dc2626' : undefined,
                          backgroundColor: formErrors.customerPhone ? '#fff5f5' : undefined
                        }}
                      />
                      {formErrors.customerPhone && (
                        <div style={{ color: '#dc2626', fontSize: '0.72rem', marginTop: '3px', fontWeight: '500' }}>
                          {formErrors.customerPhone}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div className="ai-form-row">
                      <label className="ai-form-label">Năm sinh <span style={{ color: '#dc2626' }}>*</span></label>
                      <input
                        type="number"
                        className="ai-form-input"
                        placeholder="Nhập năm sinh"
                        value={customerBirthYear}
                        onChange={e => {
                          setCustomerBirthYear(e.target.value);
                          if (formErrors.customerBirthYear) setFormErrors(prev => ({ ...prev, customerBirthYear: '' }));
                        }}
                        style={{
                          borderColor: formErrors.customerBirthYear ? '#dc2626' : undefined,
                          backgroundColor: formErrors.customerBirthYear ? '#fff5f5' : undefined
                        }}
                      />
                      {formErrors.customerBirthYear && (
                        <div style={{ color: '#dc2626', fontSize: '0.72rem', marginTop: '3px', fontWeight: '500' }}>
                          {formErrors.customerBirthYear}
                        </div>
                      )}
                    </div>
                    <div className="ai-form-row">
                      <label className="ai-form-label">Số CCCD <span style={{ color: '#dc2626' }}>*</span></label>
                      <input
                        type="text"
                        className="ai-form-input"
                        placeholder="Nhập số CCCD"
                        value={customerCCCD}
                        onChange={e => {
                          setCustomerCCCD(e.target.value);
                          if (formErrors.customerCCCD) setFormErrors(prev => ({ ...prev, customerCCCD: '' }));
                        }}
                        style={{
                          borderColor: formErrors.customerCCCD ? '#dc2626' : undefined,
                          backgroundColor: formErrors.customerCCCD ? '#fff5f5' : undefined
                        }}
                      />
                      {formErrors.customerCCCD && (
                        <div style={{ color: '#dc2626', fontSize: '0.72rem', marginTop: '3px', fontWeight: '500' }}>
                          {formErrors.customerCCCD}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Banner Khách vãng lai */}
                  {!isAuthenticated && (
                    <div style={{
                      padding: '6px 10px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '0.73rem',
                      color: '#475569',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span>💡 Đặt vé Khách vãng lai (không voucher & tích điểm).</span>
                      <button
                        type="button"
                        onClick={() => navigate('/login')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#2563eb',
                          fontWeight: '700',
                          cursor: 'pointer',
                          fontSize: '0.73rem',
                          textDecoration: 'underline'
                        }}
                      >
                        Đăng nhập
                      </button>
                    </div>
                  )}

                  {/* Mục Điểm tích lũy (Chỉ thành viên đăng nhập) */}
                  {isAuthenticated && user && (
                    <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 8px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', fontWeight: '700', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={usePoints}
                          onChange={e => {
                            setUsePoints(e.target.checked);
                            if (e.target.checked) setPointsInput(Math.min(user.points || 0, amountAfterVoucher));
                            else setPointsInput(0);
                          }}
                          style={{ accentColor: '#16a34a' }}
                        />
                        Sử dụng điểm tích lũy (Bạn có: {(user.points || 0).toLocaleString('vi-VN')} điểm)
                      </label>

                      {usePoints && (
                        <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingTop: '5px', borderTop: '1px dashed #cbd5e1' }}>
                          <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: '600' }}>Số điểm sử dụng:</span>
                          <input
                            type="number"
                            min="0"
                            max={maxPointsCanUse}
                            value={pointsInput}
                            onChange={(e) => {
                              const val = Math.max(0, Math.min(Number(e.target.value) || 0, maxPointsCanUse));
                              setPointsInput(val);
                            }}
                            className="ai-form-input"
                            style={{ width: '90px', padding: '3px 6px', fontSize: '0.75rem', fontWeight: '700' }}
                          />
                          <span style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: '700' }}>
                            Giảm trừ: -{Number(pointsInput || 0).toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mục Voucher (Chỉ thành viên đăng nhập) */}
                  {isAuthenticated && user && (
                    <div className="ai-form-row">
                      <label className="ai-form-label">Mã Voucher giảm giá</label>
                      <select
                        className="ai-form-select"
                        value={selectedVoucherCode}
                        onChange={e => setSelectedVoucherCode(e.target.value)}
                      >
                        <option value="">-- Không áp dụng voucher --</option>
                        {availableVouchers.map(v => (
                          <option key={v._id || v.code} value={v.code}>
                            {v.code} ({v.discountType === 'percentage' ? `Giảm ${v.discountValue}%` : `Giảm ${Math.round(v.discountValue / 1000)}k`})
                          </option>
                        ))}
                      </select>
                      {appliedPromo && appliedPromo.minOrderValue > originalBookingAmount && (
                        <div style={{ color: '#ea580c', fontSize: '0.7rem', marginTop: '3px', fontWeight: '600' }}>
                          ⚠️ Mã {appliedPromo.code} yêu cầu đơn hàng từ {appliedPromo.minOrderValue.toLocaleString('vi-VN')}đ trở lên (Hiện tại: {originalBookingAmount.toLocaleString('vi-VN')}đ).
                        </div>
                      )}
                    </div>
                  )}

                  {/* Bảng giá tính toán */}
                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '6px', fontSize: '0.74rem', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                      <span>Giá vé gốc:</span>
                      <span>{originalBookingAmount.toLocaleString('vi-VN')} đ</span>
                    </div>
                    {voucherDiscountAmount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2563eb', fontWeight: '700' }}>
                        <span>Giảm voucher ({selectedVoucherCode}):</span>
                        <span>-{voucherDiscountAmount.toLocaleString('vi-VN')} đ</span>
                      </div>
                    )}
                    {pointsDiscountAmount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: '700' }}>
                        <span>Giảm từ điểm tích lũy:</span>
                        <span>-{pointsDiscountAmount.toLocaleString('vi-VN')} đ</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3px', fontWeight: '800' }}>
                      <span>Tổng thanh toán:</span>
                      <span style={{ fontSize: '1.05rem', color: '#1d4ed8' }}>
                        {totalPayAmount.toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={selectedSeats.length === 0}
                    style={{
                      marginTop: '4px',
                      padding: '8px 0',
                      background: selectedSeats.length > 0 ? '#1d4ed8' : '#94a3b8',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: '800',
                      cursor: selectedSeats.length > 0 ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <CreditCard size={14} />
                    Xác Nhận Đặt Vé ({selectedSeats.length} ghế)
                  </button>
                </form>

              </div>
            ) : (
              /* Bước thanh toán QR PayOS */
              <div style={{ padding: '16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <div style={{ color: '#16a34a', fontWeight: '800', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={20} />
                  Tạo Đơn Đặt Vé Thành Công!
                </div>
                <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                  Mã đơn hàng: <strong style={{ color: '#1d4ed8' }}>#{createdBooking?.orderCode}</strong> | Ghế: <strong>{selectedSeats.join(', ')}</strong>
                </div>

                {createdBooking?.totalAmount > 0 ? (
                  <>
                    {(() => {
                      const payosAcc = createdBooking?.payosData?.accountNumber || '0919210046';
                      const payosQr = createdBooking?.payosData?.qrCode
                        ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(createdBooking.payosData.qrCode)}`
                        : `https://img.vietqr.io/image/MB-${payosAcc}-compact2.png?amount=${createdBooking?.totalAmount}&addInfo=SmartBus%20${createdBooking?.orderCode}&accountName=HO%20VAN%20LOC`;

                      return (
                        <>
                          <img
                            src={payosQr}
                            alt="VietQR PayOS"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=2|99|${payosAcc}|HO%20VAN%20LOC||0|0|${createdBooking?.totalAmount}|SmartBus%20${createdBooking?.orderCode}|transfer_my_qr`;
                            }}
                            style={{ width: '100%', maxWidth: '200px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 10px rgba(0,0,0,0.06)' }}
                          />

                          <div style={{ textAlign: 'left', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', maxWidth: '290px', margin: '4px auto', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <div>Ngân hàng: <strong>MBBank (Ngân hàng Quân Đội)</strong></div>
                            <div>Số tài khoản: <strong style={{ color: '#1d4ed8' }}>{payosAcc}</strong></div>
                            <div>Chủ tài khoản: <strong>{createdBooking?.payosData?.accountName || 'HO VAN LOC'}</strong></div>
                            <div>Số tiền: <strong style={{ color: '#dc2626', fontSize: '0.92rem' }}>{createdBooking.totalAmount.toLocaleString('vi-VN')} đ</strong></div>
                            <div>Nội dung CK: <strong style={{ color: '#1d4ed8' }}>SmartBus {createdBooking?.orderCode}</strong></div>
                          </div>

                          {createdBooking?.payosData?.checkoutUrl && (
                            <a
                              href={createdBooking.payosData.checkoutUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                padding: '8px 14px',
                                background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                                color: '#ffffff',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                fontWeight: '700',
                                textDecoration: 'none',
                                width: '100%',
                                maxWidth: '290px'
                              }}
                            >
                              👉 Mở trang thanh toán PayOS trực tiếp
                            </a>
                          )}
                        </>
                      );
                    })()}

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      backgroundColor: '#eff6ff',
                      borderRadius: '8px',
                      border: '1px solid #bfdbfe',
                      fontSize: '0.75rem',
                      color: '#1e40af',
                      width: '100%',
                      maxWidth: '290px'
                    }}>
                      <div className="payment-pulse-spinner" style={{ width: '14px', height: '14px', flexShrink: 0 }}></div>
                      <span>Đang chờ chuyển khoản... Hệ thống sẽ tự động xác nhận ngay.</span>
                    </div>
                  </>
                ) : (
                  <div style={{ padding: '10px', color: '#16a34a', fontWeight: '700', fontSize: '0.86rem' }}>
                    Đơn vé đã được thanh toán 100% bằng điểm thưởng / voucher.
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleCloseBookingModal}
                  style={{
                    padding: '6px 14px',
                    background: '#f1f5f9',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Đóng & Trở Về Khung Chat
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

export default AIAssistantPage;
