import React, { useState, useEffect, useRef, useContext } from 'react';
import API_BASE_URL from '../../config/api';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import {
  MapPin,
  Calendar,
  Clock,
  Shield,
  Star,
  Tv,
  Wifi,
  Coffee,
  Wind,
  Utensils,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Users,
  Search,
  ArrowLeft,
  ArrowRight,
  Camera,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Bus
} from 'lucide-react';
import './TripsPage.css';

const API_BASE = API_BASE_URL + '/api/trips';

const TripsPage = () => {
  const { search } = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useContext(AuthContext);

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search parameters parsed from URL
  const queryParams = new URLSearchParams(search);
  const fromParam = queryParams.get('from') || '';
  const toParam = queryParams.get('to') || '';
  const dateParam = queryParams.get('date') || '';
  const passengersParam = queryParams.get('passengers') || '1';

  // Search form states
  const [from, setFrom] = useState(fromParam);
  const [to, setTo] = useState(toParam);
  const [date, setDate] = useState(dateParam);
  const [passengers, setPassengers] = useState(Number(passengersParam));
  const [tripType, setTripType] = useState(queryParams.get('type') || 'one-way');

  const fromRef = useRef(null);
  const toRef = useRef(null);
  const [showFromSuggestions, setShowFromSuggestions] = useState(false);
  const [showToSuggestions, setShowToSuggestions] = useState(false);

  const [fromLocations, setFromLocations] = useState([]);
  const [toLocations, setToLocations] = useState([]);

  // Quản lý hiển thị xem thêm tiện ích của từng chuyến
  const [expandedAmenities, setExpandedAmenities] = useState({});

  const toggleShowMoreAmenities = (tripId) => {
    setExpandedAmenities(prev => ({
      ...prev,
      [tripId]: !prev[tripId]
    }));
  };

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

  // Filter locations based on user input
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

  // AI Landmark & Semantic States
  const [activeAiBanner, setActiveAiBanner] = useState(null);

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

  // Synchronize URL parameters to form states when search changes
  useEffect(() => {
    const qParams = new URLSearchParams(search);
    const fP = qParams.get('from') || '';
    const tP = qParams.get('to') || '';
    setFrom(fP);
    setTo(tP);
    setDate(qParams.get('date') || '');
    setPassengers(Number(qParams.get('passengers') || '1'));
    setTripType(qParams.get('type') || 'one-way');
  }, [search]);

  // Expansion and seat selection state
  const [expandedTripId, setExpandedTripId] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [selectedFloor, setSelectedFloor] = useState('lower'); // 'lower' or 'upper'
  const [selectedPickup, setSelectedPickup] = useState('');
  const [selectedDropoff, setSelectedDropoff] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isGuestBooking, setIsGuestBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingStep, setBookingStep] = useState('seats'); // 'seats', 'customer-info', 'payment'
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerBirthYear, setCustomerBirthYear] = useState('');
  const [customerCCCD, setCustomerCCCD] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerErrors, setCustomerErrors] = useState({});
  const [paymentType, setPaymentType] = useState('immediate'); // 'immediate', 'later'
  const [createdBooking, setCreatedBooking] = useState(null);
  const [usePoints, setUsePoints] = useState(false);
  const [pointsInput, setPointsInput] = useState(0);

  // Quản lý ưu đãi / Voucher khuyến mãi
  const [promotionsList, setPromotionsList] = useState([]);
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [customVoucherCode, setCustomVoucherCode] = useState('');
  const [voucherError, setVoucherError] = useState('');

  // Tải danh sách ưu đãi / voucher đang hoạt động
  useEffect(() => {
    const fetchPromos = async () => {
      try {
        const res = await axios.get(API_BASE_URL + '/api/promotions');
        if (res.data && res.data.data) {
          const activeList = res.data.data.filter(p => p.status === 'active');
          setPromotionsList(activeList);
        }
      } catch (err) {
        console.warn('Không thể tải danh sách ưu đãi:', err);
      }
    };
    fetchPromos();
  }, []);

  // Khóa giữ chỗ ghế Real-time (5 phút)
  const [lockedSeats, setLockedSeats] = useState({});
  const [nowTime, setNowTime] = useState(Date.now());

  const getClientId = () => {
    let cid = sessionStorage.getItem('customer_seat_client_id');
    if (!cid) {
      cid = 'cust_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
      sessionStorage.setItem('customer_seat_client_id', cid);
    }
    return cid;
  };

  useEffect(() => {
    const timer = setInterval(() => setNowTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Tính thời gian đếm ngược 5 phút khi khách hàng chọn ghế
  const mySeatExpiries = selectedSeats
    .map(s => lockedSeats[s]?.expiresAt)
    .filter(exp => typeof exp === 'number');

  const earliestExpiry = mySeatExpiries.length > 0
    ? Math.min(...mySeatExpiries)
    : null;

  const remainingSeconds = earliestExpiry
    ? Math.max(0, Math.ceil((earliestExpiry - nowTime) / 1000))
    : (selectedSeats.length > 0 ? 300 : 0);

  const timerMins = Math.floor(remainingSeconds / 60);
  const timerSecs = remainingSeconds % 60;
  const formattedCountdown = `${String(timerMins).padStart(2, '0')}:${String(timerSecs).padStart(2, '0')}`;

  useEffect(() => {
    if (selectedSeats.length > 0 && remainingSeconds === 0) {
      alert('Đã hết thời gian giữ chỗ 5 phút. Ghế đã được tự động mở lại cho người khác.');
      setSelectedSeats([]);
      setBookingStep('seats');
    }
  }, [remainingSeconds, selectedSeats.length]);

  // Tự động cuộn lên đầu màn hình khi chuyển bước đặt vé (chọn ghế -> thông tin -> thanh toán)
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  }, [bookingStep]);

  // Lắng nghe sự kiện SSE khóa/mở ghế theo thời gian thực
  useEffect(() => {
    if (!expandedTripId) {
      setLockedSeats({});
      return;
    }

    const es = new EventSource(`${API_BASE}/${expandedTripId}/seat-locks/stream`);

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

    es.addEventListener('LOCK_SEAT', (e) => {
      try {
        const data = JSON.parse(e.data);
        setLockedSeats(prev => ({
          ...prev,
          [data.seat]: { lockedBy: data.lockedBy, expiresAt: data.expiresAt }
        }));
      } catch (err) { }
    });

    es.addEventListener('UNLOCK_SEAT', (e) => {
      try {
        const data = JSON.parse(e.data);
        setLockedSeats(prev => {
          const next = { ...prev };
          delete next[data.seat];
          return next;
        });
        if (data.reason === 'EXPIRED') {
          setSelectedSeats(prev => prev.filter(s => s !== data.seat));
        }
      } catch (err) { }
    });

    es.addEventListener('BOOKED_SEATS', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.tripId === expandedTripId && Array.isArray(data.bookedSeats)) {
          setTrips(prev => prev.map(t => {
            if (t._id === expandedTripId) {
              return {
                ...t,
                bookedSeats: [...new Set([...(t.bookedSeats || []), ...data.bookedSeats])]
              };
            }
            return t;
          }));
          setSelectedSeats(prev => prev.filter(s => !data.bookedSeats.includes(s)));
        }
      } catch (err) { }
    });

    es.addEventListener('RELEASED_SEATS', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.tripId === expandedTripId && Array.isArray(data.releasedSeats)) {
          setTrips(prev => prev.map(t => {
            if (t._id === expandedTripId) {
              return {
                ...t,
                bookedSeats: (t.bookedSeats || []).filter(s => !data.releasedSeats.includes(s))
              };
            }
            return t;
          }));
        }
      } catch (err) { }
    });

    return () => {
      es.close();
    };
  }, [expandedTripId]);

  // Giải phóng ghế khi tắt trang/reload
  useEffect(() => {
    const handleUnload = () => {
      if (expandedTripId && selectedSeats.length > 0) {
        const payload = JSON.stringify({ clientId: getClientId(), seats: selectedSeats });
        navigator.sendBeacon(`${API_BASE}/${expandedTripId}/unlock-all-my-seats`, new Blob([payload], { type: 'application/json' }));
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [expandedTripId, selectedSeats]);

  useEffect(() => {
    if (user) {
      setCustomerName(user.name || '');
      setCustomerPhone(user.phone || '');
      setCustomerEmail(user.email || '');
    }
  }, [user]);

  // Expandable details state
  const [activeDetailsTripId, setActiveDetailsTripId] = useState(null);
  const [activeDetailTab, setActiveDetailTab] = useState('pickup-dropoff');
  const [loadedTripDetails, setLoadedTripDetails] = useState({});
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Filters State
  const [busTypeFilter, setBusTypeFilter] = useState('all'); // 'all', 'sleeper', 'limousine', 'seater'
  const [sortBy, setSortBy] = useState('time-asc'); // 'time-asc', 'price-asc', 'price-desc', 'rating-desc', 'seats-desc'
  const [isDiscountOnly, setIsDiscountOnly] = useState(false);
  const [isPickupDelivery, setIsPickupDelivery] = useState(false); // Xe đón tận nơi
  const [isNightTrip, setIsNightTrip] = useState(false); // Chuyến đêm (21:00 - 05:00)
  const [activeTimeSlot, setActiveTimeSlot] = useState('all'); // 'all', 'early', 'morning', 'afternoon', 'evening'
  const [startHour, setStartHour] = useState(0);
  const [endHour, setEndHour] = useState(24);
  const [maxPrice, setMaxPrice] = useState(2000000);
  const [minSeats, setMinSeats] = useState(0);
  const [pickupSearch, setPickupSearch] = useState('');
  const [selectedPickups, setSelectedPickups] = useState([]);
  const [dropoffSearch, setDropoffSearch] = useState('');
  const [selectedDropoffs, setSelectedDropoffs] = useState([]);

  const handleTimeSlotClick = (slot) => {
    if (activeTimeSlot === slot) {
      setActiveTimeSlot('all');
      setStartHour(0);
      setEndHour(24);
    } else {
      setActiveTimeSlot(slot);
      if (slot === 'early') { setStartHour(0); setEndHour(6); }
      else if (slot === 'morning') { setStartHour(6); setEndHour(12); }
      else if (slot === 'afternoon') { setStartHour(12); setEndHour(18); }
      else if (slot === 'evening') { setStartHour(18); setEndHour(24); }
    }
  };

  const getTomorrowDate = (dStr) => {
    const base = dStr ? new Date(dStr) : new Date();
    base.setDate(base.getDate() + 1);
    return base.toISOString().split('T')[0];
  };

  const handleClearFilters = () => {
    setIsDiscountOnly(false);
    setIsPickupDelivery(false);
    setIsNightTrip(false);
    setActiveTimeSlot('all');
    setStartHour(0);
    setEndHour(24);
    setMaxPrice(2000000);
    setMinSeats(0);
    setPickupSearch('');
    setSelectedPickups([]);
    setDropoffSearch('');
    setSelectedDropoffs([]);
    setBusTypeFilter('all');
    setSortBy('time-asc');
  };

  const handleResetSearchAndFilters = () => {
    handleClearFilters();
    setFrom('');
    setTo('');
    const today = new Date().toISOString().split('T')[0];
    setDate(today);
    setPassengers(1);
    navigate(`/trips?date=${today}&passengers=1`);
  };

  useEffect(() => {
    const fetchTrips = async () => {
      setLoading(true);
      setError(null);
      try {
        const effectiveDate = dateParam || new Date().toISOString().split('T')[0];
        const res = await axios.get(`${API_BASE}/search?from=${encodeURIComponent(fromParam || '')}&to=${encodeURIComponent(toParam || '')}&date=${effectiveDate}&passengers=${passengersParam || 1}`);
        if (res.data.success) {
          setTrips(res.data.trips);
          if (res.data.aiSemanticInfo) {
            setActiveAiBanner(res.data.aiSemanticInfo);
          } else {
            setActiveAiBanner(null);
          }
        } else {
          setError(res.data.message || 'Không tìm thấy chuyến đi nào.');
          setActiveAiBanner(null);
        }
      } catch (err) {
        console.error('Error fetching trips:', err);
        setError(err.response?.data?.message || 'Có lỗi xảy ra khi tải danh sách chuyến đi.');
        setActiveAiBanner(null);
      } finally {
        setLoading(false);
      }
    };

    fetchTrips();
  }, [fromParam, toParam, dateParam, passengersParam]);

  // Format date display
  const formatDateDisplay = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return d.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  // Helper to format currency
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  // Toggle seat selection với Real-time locking (5 phút)
  const handleSeatClick = async (seatCode, isBooked) => {
    if (isBooked || !expandedTripId) return;

    const myClientId = getClientId();
    const lock = lockedSeats[seatCode];

    // Nếu ghế đang bị người khác giữ chỗ (trong vòng 5 phút)
    if (lock && lock.lockedBy !== myClientId && lock.expiresAt > Date.now()) {
      const remaining = Math.max(1, Math.round((lock.expiresAt - Date.now()) / 1000));
      alert(`Ghế ${seatCode} đang được người khác giữ chỗ (còn ${remaining} giây). Vui lòng chọn ghế khác.`);
      return;
    }

    // Nếu ghế đang được chính mình chọn -> Hủy chọn (Mở khóa)
    if (selectedSeats.includes(seatCode)) {
      try {
        await axios.post(`${API_BASE}/${expandedTripId}/unlock-seat`, {
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
      return;
    }

    // Tiến hành khóa giữ chỗ ghế trong 5 phút trên server
    try {
      const res = await axios.post(`${API_BASE}/${expandedTripId}/lock-seat`, {
        seat: seatCode,
        clientId: myClientId
      });
      if (res.data && res.data.success) {
        setSelectedSeats(prev => [...prev, seatCode]);
        if (res.data.expiresAt) {
          setLockedSeats(prev => ({
            ...prev,
            [seatCode]: { lockedBy: myClientId, expiresAt: res.data.expiresAt }
          }));
        }
      } else {
        alert(res.data?.message || `Ghế ${seatCode} vừa được người khác giữ chỗ. Vui lòng chọn ghế khác.`);
      }
    } catch (err) {
      const msg = err.response?.data?.message || `Ghế ${seatCode} vừa được người khác giữ chỗ. Vui lòng chọn ghế khác.`;
      alert(msg);
    }
  };

  // Toggle expanded card to view seat map
  const toggleSelectSeats = async (trip) => {
    if (expandedTripId === trip._id) {
      if (selectedSeats.length > 0) {
        try {
          await axios.post(`${API_BASE}/${expandedTripId}/unlock-all-my-seats`, {
            clientId: getClientId(),
            seats: selectedSeats
          });
        } catch (e) { }
      }
      setExpandedTripId(null);
      setSelectedSeats([]);
      setBookingStep('seats');
    } else {
      if (expandedTripId && selectedSeats.length > 0) {
        try {
          await axios.post(`${API_BASE}/${expandedTripId}/unlock-all-my-seats`, {
            clientId: getClientId(),
            seats: selectedSeats
          });
        } catch (e) { }
      }
      setExpandedTripId(trip._id);
      setSelectedSeats([]);
      setSelectedPickup(trip.pickupPoints[0]?.location || '');
      setSelectedDropoff(trip.dropoffPoints[0]?.location || '');
      setBookingStep('seats');

      setTimeout(() => {
        const el = document.getElementById(`trip-card-${trip._id}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 50);
    }
  };

  // Toggle details view
  const toggleDetails = async (tripId) => {
    if (activeDetailsTripId === tripId) {
      setActiveDetailsTripId(null);
    } else {
      setActiveDetailsTripId(tripId);
      setActiveDetailTab('pickup-dropoff');
      if (!loadedTripDetails[tripId]) {
        setDetailsLoading(true);
        try {
          const res = await axios.get(`${API_BASE}/${tripId}`);
          if (res.data.success) {
            setLoadedTripDetails(prev => ({
              ...prev,
              [tripId]: {
                trip: res.data.trip,
                reviews: res.data.reviews
              }
            }));
          }
        } catch (err) {
          console.error("Lỗi lấy chi tiết chuyến đi:", err);
        } finally {
          setDetailsLoading(false);
        }
      }
    }
  };

  // Handle trip search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const cleanFrom = (from || '').trim();
    const cleanTo = (to || '').trim();

    if (cleanFrom && cleanTo && cleanFrom.toLowerCase() === cleanTo.toLowerCase()) {
      alert('Điểm đến không được trùng với điểm xuất phát.');
      return;
    }

    const targetDate = date || new Date().toISOString().split('T')[0];
    const fromQuery = cleanFrom ? encodeURIComponent(cleanFrom) : '';
    const toQuery = cleanTo ? encodeURIComponent(cleanTo) : '';

    navigate(`/trips?from=${fromQuery}&to=${toQuery}&date=${targetDate}&passengers=${passengers}&type=${tripType}`);
  };

  // Handle booking submission - step 1: Validate seats & transitions to step 2
  const handleBookingSubmit = async () => {
    if (selectedSeats.length === 0) {
      alert('Vui lòng chọn ít nhất một ghế.');
      return;
    }
    if (!selectedPickup || !selectedDropoff) {
      alert('Vui lòng chọn điểm đón và điểm trả.');
      return;
    }

    if (!isAuthenticated) {
      setShowAuthModal(true);
    } else {
      setIsGuestBooking(false);
      setBookingStep('customer-info');
    }
  };

  // Tính toán số tiền giảm trừ từ voucher
  const getVoucherDiscountAmount = (voucher, originalAmount) => {
    if (!voucher || !originalAmount) return 0;
    if (voucher.minOrderValue && originalAmount < voucher.minOrderValue) return 0;
    let discount = 0;
    if (voucher.discountType === 'percentage') {
      discount = Math.round((originalAmount * voucher.discountValue) / 100);
      if (voucher.maxDiscountAmount > 0 && discount > voucher.maxDiscountAmount) {
        discount = voucher.maxDiscountAmount;
      }
    } else {
      discount = Math.min(originalAmount, voucher.discountValue || 0);
    }
    return discount;
  };

  const handleApplyVoucher = (voucher, currentTotal) => {
    setVoucherError('');
    if (voucher.minOrderValue && currentTotal < voucher.minOrderValue) {
      setVoucherError(`Voucher ${voucher.code} yêu cầu đơn hàng từ ${formatCurrency(voucher.minOrderValue)} trở lên.`);
      return;
    }
    setAppliedVoucher(voucher);
  };

  const handleApplyCustomCode = async (e, currentTotal) => {
    e.preventDefault();
    if (!customVoucherCode.trim()) return;
    setVoucherError('');
    try {
      const res = await axios.post(API_BASE_URL + '/api/promotions/validate', {
        code: customVoucherCode.trim().toUpperCase(),
        orderAmount: currentTotal
      });
      if (res.data && res.data.success && res.data.data) {
        setAppliedVoucher(res.data.data);
        setCustomVoucherCode('');
      } else {
        setVoucherError(res.data?.message || 'Mã ưu đãi không hợp lệ.');
      }
    } catch (err) {
      setVoucherError(err.response?.data?.message || 'Mã ưu đãi không hợp lệ hoặc đã hết hạn.');
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherError('');
  };

  const validateCustomerForm = () => {
    const errs = {};
    const nameTrimmed = (customerName || '').trim();
    const phoneTrimmed = (customerPhone || '').trim();
    const birthYearVal = (customerBirthYear || '').toString().trim();
    const cccdTrimmed = (customerCCCD || '').trim();
    const emailTrimmed = (customerEmail || '').trim();

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

    // 5. Email (Không bắt buộc)
    if (emailTrimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      errs.customerEmail = 'Email không đúng định dạng.';
    }

    setCustomerErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit passenger details and create pending booking
  const handleCustomerInfoSubmit = async (e) => {
    e.preventDefault();
    if (!validateCustomerForm()) {
      return;
    }

    const currentTrip = trips.find(t => t._id === expandedTripId);
    if (currentTrip) {
      try {
        const isGuest = !isAuthenticated || isGuestBooking;
        const origTotal = (currentTrip.price || 0) * selectedSeats.length;
        const vDiscount = isGuest ? 0 : getVoucherDiscountAmount(appliedVoucher, origTotal);
        const amountAfterV = Math.max(0, origTotal - vDiscount);
        const availablePts = (!isGuest && user) ? (user.points || 0) : 0;
        const discountPts = (!isGuest && usePoints && user) ? Math.min(Math.max(0, Number(pointsInput) || 0), availablePts, amountAfterV) : 0;

        const res = await axios.post(`${API_BASE}/book`, {
          tripId: currentTrip._id,
          userId: isGuest ? 'user_guest' : (user?.id || user?._id || 'user_guest'),
          seats: selectedSeats,
          pickup: selectedPickup,
          dropoff: selectedDropoff,
          customerName,
          customerPhone,
          customerBirthYear: Number(customerBirthYear),
          customerCCCD,
          customerEmail,
          paymentType: 'immediate',
          pointsUsed: discountPts,
          voucherCode: (!isGuest && appliedVoucher) ? appliedVoucher.code : ''
        });

        if (res.data.success) {
          setCreatedBooking({ ...res.data.booking, payosData: res.data.payosData });
          setBookingStep('payment');
        } else {
          alert(res.data.message || 'Lỗi lưu thông tin khách hàng.');
        }
      } catch (err) {
        console.error("Lỗi đặt vé:", err);
        alert(err.response?.data?.message || 'Có lỗi xảy ra khi gửi thông tin khách hàng.');
      }
    }
  };

  // Tự động kiểm tra trạng thái thanh toán từ PayOS Webhook (polling mỗi 2 giây)
  useEffect(() => {
    if (bookingStep !== 'payment' || !createdBooking?.orderCode || bookingSuccess) return;

    let isMounted = true;
    const orderCode = createdBooking.orderCode;
    const currentTrip = trips.find(t => t._id === expandedTripId);

    const interval = setInterval(async () => {
      try {
        const backendOrigin = API_BASE.replace(/\/api\/.*$/, '');
        const res = await axios.get(`${backendOrigin}/api/bookings/order/${orderCode}`);
        if (!isMounted) return;

        if (res.data?.success && res.data.booking?.status === 'paid') {
          clearInterval(interval);

          const newBooking = {
            id: orderCode,
            bookingId: createdBooking._id,
            tripId: currentTrip?._id,
            busName: currentTrip?.busId?.name || 'Xe An Bình Lines',
            busType: currentTrip?.busId?.type || 'Giường nằm VIP',
            from: currentTrip?.routeId?.startPoint || fromParam || 'Hồ Chí Minh',
            to: currentTrip?.routeId?.endPoint || toParam || 'Đà Lạt',
            departureTime: currentTrip?.departureTime,
            price: currentTrip?.price,
            seats: [...selectedSeats],
            pickup: selectedPickup,
            dropoff: selectedDropoff,
            customerName,
            customerPhone,
            customerBirthYear,
            customerCCCD,
            customerEmail,
            bookingDate: new Date().toISOString(),
            paymentType: 'immediate',
            status: 'paid'
          };

          const existing = JSON.parse(localStorage.getItem('booked_tickets') || '[]');
          localStorage.setItem('booked_tickets', JSON.stringify([newBooking, ...existing]));

          // Chặn ghế đã đặt trong state trips
          if (currentTrip) {
            setTrips(prevTrips => prevTrips.map(t => {
              if (t._id === currentTrip._id) {
                return {
                  ...t,
                  bookedSeats: [...(t.bookedSeats || []), ...selectedSeats]
                };
              }
              return t;
            }));
          }

          setCreatedBooking(prev => ({ ...prev, status: 'paid' }));
          setBookingSuccess(true);
        }
      } catch (err) {
        // Bỏ qua lỗi kết nối polling tạm thời
      }
    }, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [bookingStep, createdBooking, bookingSuccess, trips, expandedTripId, selectedSeats, selectedPickup, selectedDropoff, customerName, customerPhone, customerBirthYear, customerCCCD, customerEmail, fromParam, toParam]);

  // Webhook Simulation (PayOS Success)
  const handleSimulatePaymentSuccess = async () => {
    if (!createdBooking) return;
    const currentTrip = trips.find(t => t._id === expandedTripId);
    try {
      const payAmount = createdBooking.totalAmount !== undefined ? createdBooking.totalAmount : (currentTrip.price * selectedSeats.length);
      // Simulate webhook call to backend
      const res = await axios.post(`${API_BASE}/payment/webhook`, {
        code: '00',
        desc: 'success',
        data: {
          orderCode: createdBooking.orderCode,
          amount: payAmount,
          description: `Thanh toan ve xe cho ma dat cho ${createdBooking._id}`
        }
      });

      if (res.data.success) {
        // Successful webhook processing
        // Prepare ticket details for client history
        const newBooking = {
          id: createdBooking.orderCode,
          bookingId: createdBooking._id,
          tripId: currentTrip._id,
          busName: currentTrip.busId.name,
          busType: currentTrip.busId.type,
          from: currentTrip.routeId?.startPoint || fromParam || 'Hồ Chí Minh',
          to: currentTrip.routeId?.endPoint || toParam || 'Đà Lạt',
          departureTime: currentTrip.departureTime,
          price: currentTrip.price,
          seats: [...selectedSeats],
          pickup: selectedPickup,
          dropoff: selectedDropoff,
          customerName,
          customerPhone,
          customerBirthYear,
          customerCCCD,
          customerEmail,
          bookingDate: new Date().toISOString(),
          paymentType: 'immediate',
          status: 'paid'
        };

        const existing = JSON.parse(localStorage.getItem('booked_tickets') || '[]');
        localStorage.setItem('booked_tickets', JSON.stringify([newBooking, ...existing]));

        // Instantly block the seats in local state
        setTrips(prevTrips => prevTrips.map(t => {
          if (t._id === currentTrip._id) {
            return {
              ...t,
              bookedSeats: [...(t.bookedSeats || []), ...selectedSeats]
            };
          }
          return t;
        }));

        setCreatedBooking(prev => ({ ...prev, status: 'paid' }));
        setBookingSuccess(true);
      } else {
        alert('Giả lập webhook thanh toán thất bại.');
      }
    } catch (err) {
      console.error('Lỗi giả lập thanh toán:', err);
      alert('Có lỗi xảy ra khi gửi dữ liệu giả lập webhook.');
    }
  };

  // Confirm Pay Later (within 5 days) - Chỉ dành cho Thành viên
  const handleConfirmPayLater = async () => {
    if (!createdBooking) return;
    if (!isAuthenticated || isGuestBooking) {
      alert('Khách vãng lai không được phép thanh toán sau. Vui lòng hoàn tất thanh toán trực tuyến ngay qua mã VietQR.');
      return;
    }
    const currentTrip = trips.find(t => t._id === expandedTripId);

    // Block pay-later if departure < 24h to prevent immediate auto-cancellation
    if (currentTrip) {
      const hoursUntilDep = (new Date(currentTrip.departureTime) - new Date()) / 3600000;
      if (hoursUntilDep < 24) {
        alert(`Không thể chọn thanh toán sau!\nChuyến xe khởi hành trong ${Math.floor(hoursUntilDep)} giờ nữa – không đủ thời gian để thanh toán sau.\nVui lòng thanh toán ngay bây giờ.`);
        return;
      }
    }

    try {
      const res = await axios.patch(`${API_BASE}/book/${createdBooking._id}`, {
        paymentType: 'later'
      });

      if (res.data.success) {
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 5);

        const newBooking = {
          id: createdBooking.orderCode,
          bookingId: createdBooking._id,
          tripId: currentTrip._id,
          busName: currentTrip.busId.name,
          busType: currentTrip.busId.type,
          from: currentTrip.routeId?.startPoint || fromParam || 'Hồ Chí Minh',
          to: currentTrip.routeId?.endPoint || toParam || 'Đà Lạt',
          departureTime: currentTrip.departureTime,
          price: currentTrip.price,
          seats: [...selectedSeats],
          pickup: selectedPickup,
          dropoff: selectedDropoff,
          customerName,
          customerPhone,
          customerBirthYear,
          customerCCCD,
          customerEmail,
          bookingDate: new Date().toISOString(),
          paymentType: 'later',
          paymentExpiresAt: expirationDate.toISOString(),
          status: 'pending'
        };

        const existing = JSON.parse(localStorage.getItem('booked_tickets') || '[]');
        localStorage.setItem('booked_tickets', JSON.stringify([newBooking, ...existing]));

        // Block seats in local state
        setTrips(prevTrips => prevTrips.map(t => {
          if (t._id === currentTrip._id) {
            return {
              ...t,
              bookedSeats: [...(t.bookedSeats || []), ...selectedSeats]
            };
          }
          return t;
        }));

        setCreatedBooking(prev => ({
          ...prev,
          paymentType: 'later',
          paymentExpiresAt: expirationDate.toISOString(),
          status: 'pending'
        }));
        setBookingSuccess(true);
      } else {
        alert(res.data.message || 'Lỗi cập nhật hình thức thanh toán.');
      }
    } catch (err) {
      console.error('Lỗi thiết lập thanh toán sau:', err);
      alert('Có lỗi xảy ra khi thiết lập thanh toán sau.');
    }
  };

  // Generate seat map arrays (VIP 2-column or 3-column layout)
  const getSeatLayout = (totalSeats, busType = '') => {
    const lowerFloor = [];
    const upperFloor = [];
    const typeStr = (busType || '').toLowerCase();

    // Determine if it is a double-decker (giường nằm hoặc limousine phòng cabin)
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
      // 1. Xe giường phòng cabin VIP: 20, 22, 24 phòng (3 cột, 2 dãy cabin, 2 tầng)
      if (totalSeats === 20 || totalSeats === 22 || totalSeats === 24) {
        if (totalSeats === 20) {
          // 10 cabin per floor. Row 1: 1 cabin, Row 2-4: 2 cabins, Row 5 (back row): 3 cabins.
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
          // 11 cabin per floor. Row 1-4: 2 cabins, Row 5 (back row): 3 cabins.
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
        } else if (totalSeats === 24) {
          // 12 cabin per floor. Row 1: 1 cabin, Row 2-5: 2 cabins, Row 6 (back row): 3 cabins.
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

      // 2. Xe Giường nằm truyền thống: 32, 34, 40, 44 chỗ (5 cột, 3 dãy giường, 2 tầng)
      if (totalSeats === 32 || totalSeats === 34 || totalSeats === 40 || totalSeats === 44) {
        if (totalSeats === 32) {
          // 16 per floor. Row 1: 2 seats, Row 2-4: 3 seats, Row 5 (back row): 5 seats.
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
          // 17 per floor. Row 1-4: 3 seats, Row 5 (back row): 5 seats.
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
          // 20 per floor. Row 1-5: 3 seats, Row 6 (back row): 5 seats.
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
        } else if (totalSeats === 44) {
          // 22 per floor. Row 1: 2 seats, Row 2-6: 3 seats, Row 7 (back row): 5 seats.
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

    // 3. Single Decker Layouts (1 Floor)
    // 3.1 Limousine ghế ngồi: 9 chỗ (3 cột)
    if (totalSeats === 9) {
      lowerFloor.push(['A1', null, 'A2']);
      lowerFloor.push(['A3', null, 'A4']);
      lowerFloor.push(['A5', null, 'A6']);
      lowerFloor.push(['A7', 'A8', 'A9']);
      return { lowerFloor, upperFloor: [], columns: 3 };
    }

    // 3.2 Limousine ghế ngồi: 19 chỗ (3 cột)
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

    // 3.3 Xe ghế ngồi 16 chỗ (4 cột)
    if (totalSeats === 16) {
      lowerFloor.push(['A1', 'A2', null, 'A3']);
      lowerFloor.push(['A4', 'A5', null, 'A6']);
      lowerFloor.push(['A7', 'A8', null, 'A9']);
      lowerFloor.push(['A10', 'A11', null, 'A12']);
      lowerFloor.push(['A13', 'A14', 'A15', 'A16']);
      return { lowerFloor, upperFloor: [], columns: 4 };
    }

    // 3.4 Xe ghế ngồi 29 chỗ (5 cột)
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

    // 3.5 Xe ghế ngồi 35 chỗ (5 cột)
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

    // 3.6 Xe ghế ngồi 45 chỗ (5 cột)
    if (totalSeats === 45) {
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

    // 3.7 Xe ghế ngồi 47 chỗ (5 cột)
    if (totalSeats === 47) {
      lowerFloor.push([null, null, null, 'A1', 'A2']);
      lowerFloor.push(['A3', 'A4', null, 'A5', 'A6']);
      lowerFloor.push(['A7', 'A8', null, 'A9', 'A10']);
      lowerFloor.push(['A11', 'A12', null, 'A13', 'A14']);
      lowerFloor.push(['A15', 'A16', null, 'A17', 'A18']);
      lowerFloor.push(['A19', 'A20', null, 'A21', 'A22']);
      lowerFloor.push(['A23', 'A24', null, 'A25', 'A26']);
      lowerFloor.push(['A27', 'A28', null, 'A29', 'A30']);
      lowerFloor.push(['A31', 'A32', null, 'A33', 'A34']);
      lowerFloor.push(['A35', 'A36', null, 'A37', 'A38']);
      lowerFloor.push(['A39', 'A40', null, 'A41', 'A42']);
      lowerFloor.push(['A43', 'A44', 'A45', 'A46', 'A47']);
      return { lowerFloor, upperFloor: [], columns: 5 };
    }

    // Default fallback
    for (let r = 1; r <= 8; r++) {
      const idx = (r - 1) * 2;
      lowerFloor.push([`A${idx + 1}`, null, `B${idx + 1}`, null, `C${idx + 1}`]);
      upperFloor.push([`A${idx + 2}`, null, `B${idx + 2}`, null, `C${idx + 2}`]);
    }
    return { lowerFloor, upperFloor, columns: 5 };
  };

  // Extract unique pickup/dropoff locations from all trips in the list
  const allPickups = Array.from(new Set(trips.flatMap(t => t.pickupPoints.map(p => p.location))));
  const allDropoffs = Array.from(new Set(trips.flatMap(t => t.dropoffPoints.map(d => d.location))));

  const filteredPickupLocationsList = allPickups.filter(loc =>
    loc.toLowerCase().includes(pickupSearch.toLowerCase())
  );
  const filteredDropoffLocationsList = allDropoffs.filter(loc =>
    loc.toLowerCase().includes(dropoffSearch.toLowerCase())
  );

  // Counts for bus categories
  const sleeperCount = trips.filter(t => {
    const tp = t.busId?.type?.toLowerCase() || '';
    return tp.includes('giường') || tp.includes('nằm');
  }).length;

  const limoCount = trips.filter(t => {
    const tp = t.busId?.type?.toLowerCase() || '';
    return tp.includes('limousine') || tp.includes('phòng');
  }).length;

  const cabinCount = trips.filter(t => {
    const tp = t.busId?.type?.toLowerCase() || '';
    return tp.includes('cabin') || tp.includes('cung điện');
  }).length;

  const seaterCount = trips.filter(t => {
    const tp = t.busId?.type?.toLowerCase() || '';
    return tp.includes('ghế') || tp.includes('ngồi');
  }).length;

  // Sắp xếp danh sách chuyến xe
  const filteredTrips = trips.slice().sort((a, b) => {
    if (sortBy === 'time-asc') {
      return new Date(a.departureTime) - new Date(b.departureTime);
    }
    if (sortBy === 'price-asc') {
      return a.price - b.price;
    }
    if (sortBy === 'price-desc') {
      return b.price - a.price;
    }
    if (sortBy === 'rating-desc') {
      return (b.ratings?.average || 0) - (a.ratings?.average || 0);
    }
    if (sortBy === 'seats-desc') {
      const remainingA = a.busId.totalSeats - a.bookedSeats.length;
      const remainingB = b.busId.totalSeats - b.bookedSeats.length;
      return remainingB - remainingA;
    }
    return 0;
  });

  const renderSeatSelectionView = () => {
    const trip = trips.find(t => t._id === expandedTripId);
    if (!trip) return null;

    return (
      <div className="glass-card animate-fade-in trip-seat-view-card">
        {/* Header with back button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              className="trip-back-btn"
              title="Quay lại danh sách chuyến xe"
              onClick={async () => {
                if (expandedTripId && selectedSeats.length > 0) {
                  try {
                    await axios.post(`${API_BASE}/${expandedTripId}/unlock-all-my-seats`, {
                      clientId: getClientId(),
                      seats: selectedSeats
                    });
                  } catch (e) { }
                }
                setExpandedTripId(null);
                setSelectedSeats([]);
                setBookingSuccess(false);
                setBookingStep('seats');
                window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
              }}
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h3 style={{ margin: 0, fontWeight: 700 }}>Chọn Ghế & Đặt Vé</h3>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Tuyến xe: {trip.routeId?.startPoint} → {trip.routeId?.endPoint} | Khởi hành: {new Date(trip.departureTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ({new Date(trip.departureTime).toLocaleDateString('vi-VN')})
              </span>
            </div>
          </div>

          {/* Bộ đếm ngược 5 phút gọn gàng ở góc phải */}
          {selectedSeats.length > 0 && !bookingSuccess && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: remainingSeconds <= 60 ? '#fef2f2' : '#eff6ff',
              border: `1px solid ${remainingSeconds <= 60 ? '#fca5a5' : '#bfdbfe'}`,
              padding: '6px 14px',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
              <span style={{ fontSize: '0.78rem', fontWeight: '700', color: remainingSeconds <= 60 ? '#dc2626' : '#1e40af' }}>
                Giữ chỗ:
              </span>
              <span style={{
                fontSize: '1.15rem',
                fontWeight: '800',
                fontFamily: 'monospace',
                letterSpacing: '0.5px',
                color: remainingSeconds <= 60 ? '#b91c1c' : '#1d4ed8'
              }}>
                {formattedCountdown}
              </span>
            </div>
          )}
        </div>

        {bookingSuccess ? (
          <div className="glass-card animate-fade-in" style={{ padding: '2.5rem', maxWidth: '700px', margin: '0 auto', border: '2px solid rgba(34, 197, 94, 0.3)', backgroundColor: '#ffffff' }}>
            <div style={{ textAlign: 'center', borderBottom: '2px dashed var(--border-color)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
              <CheckCircle size={56} style={{ color: '#22c55e', marginBottom: '1rem' }} />
              <h3 style={{ color: '#22c55e', fontWeight: '800', margin: 0 }}>ĐẶT VÉ THÀNH CÔNG</h3>
              <p style={{ color: 'var(--text-secondary)', margin: '5px 0 0 0', fontWeight: '500' }}>
                Hóa Đơn Điện Tử SmartBus #{createdBooking?.orderCode || '123456'}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              <div>
                <h5 style={{ fontWeight: '700', color: 'var(--primary)', marginBottom: '8px' }}>Thông Tin Hành Khách</h5>
                <p style={{ margin: '4px 0' }}>Họ tên: <strong>{customerName}</strong></p>
                <p style={{ margin: '4px 0' }}>Số điện thoại: <strong>{customerPhone}</strong></p>
                <p style={{ margin: '4px 0' }}>Năm sinh: <strong>{customerBirthYear}</strong></p>
                <p style={{ margin: '4px 0' }}>Số CCCD: <strong>{customerCCCD}</strong></p>
                {customerEmail && <p style={{ margin: '4px 0' }}>Email: <strong>{customerEmail}</strong></p>}
              </div>

              <div>
                <h5 style={{ fontWeight: '700', color: 'var(--primary)', marginBottom: '8px' }}>Thông Tin Chuyến Xe</h5>
                <p style={{ margin: '4px 0' }}>Tuyến: <strong>{trip.routeId?.startPoint} → {trip.routeId?.endPoint}</strong></p>
                <p style={{ margin: '4px 0' }}>Xe: <strong>{trip.busId?.name} ({trip.busId?.type})</strong></p>
                <p style={{ margin: '4px 0' }}>Khởi hành: <strong>{new Date(trip.departureTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ({new Date(trip.departureTime).toLocaleDateString('vi-VN')})</strong></p>
                <p style={{ margin: '4px 0' }}>Mã ghế: <strong style={{ color: 'var(--accent)' }}>{selectedSeats.join(', ')}</strong></p>
              </div>
            </div>

            <div style={{ borderBottom: '2px dashed var(--border-color)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span>Điểm đón khách:</span>
                <span style={{ fontWeight: '500', textAlign: 'right' }}>{selectedPickup}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Điểm trả khách:</span>
                <span style={{ fontWeight: '500', textAlign: 'right' }}>{selectedDropoff}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <span style={{ fontSize: '1rem', fontWeight: '700' }}>Trạng thái thanh toán:</span>
                <div style={{ marginTop: '4px' }}>
                  {createdBooking?.status === 'paid' ? (
                    <span style={{ padding: '6px 12px', borderRadius: '20px', backgroundColor: '#e8f5e9', color: '#2e7d32', fontWeight: '700', fontSize: '0.85rem' }}>
                      ĐÃ THANH TOÁN (MBBank)
                    </span>
                  ) : (
                    <span style={{ padding: '6px 12px', borderRadius: '20px', backgroundColor: '#fff3e0', color: '#ef6c00', fontWeight: '700', fontSize: '0.85rem' }}>
                      THANH TOÁN SAU (Hạn chót: {new Date(new Date().setDate(new Date().getDate() + 5)).toLocaleDateString('vi-VN')})
                    </span>
                  )}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Tổng tiền:</span>
                <h3 style={{ margin: 0, fontWeight: '800', color: 'var(--accent)' }}>{formatCurrency(trip.price * selectedSeats.length)}</h3>
              </div>
            </div>

            <div style={{ textAlign: 'center', display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button
                className="btn btn-secondary"
                style={{ padding: '10px 24px' }}
                onClick={() => {
                  window.print();
                }}
              >
                In Hóa Đơn
              </button>
              <button
                className="btn btn-primary"
                style={{ padding: '10px 24px' }}
                onClick={() => {
                  setBookingSuccess(false);
                  setBookingStep('seats');
                  setExpandedTripId(null);
                  setSelectedSeats([]);
                  setCreatedBooking(null);
                }}
              >
                Hoàn tất & Quay lại
              </button>
            </div>
          </div>
        ) : bookingStep === 'customer-info' ? (
          <div className="booking-layout">
            {/* Passenger Info Form */}
            <div>
              <h4 style={{ fontWeight: '700', marginBottom: '1.5rem', textAlign: 'center' }}>Thông Tin Khách Hàng</h4>
              <form onSubmit={handleCustomerInfoSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '450px', margin: '0 auto' }}>
                
                {/* Banner Thông Tin Khách Vãng Lai (nếu chưa đăng nhập) */}
                {(!isAuthenticated || isGuestBooking) && (
                  <div style={{
                    padding: '10px 14px',
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px'
                  }}>
                    <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: '1.4' }}>
                      <strong style={{ color: '#0f172a' }}>Khách vãng lai:</strong> Đang đặt vé nhanh không đăng nhập.
                      <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                        (Không áp dụng Voucher giảm giá & không tích điểm thành viên)
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAuthModal(true)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#2563eb',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        textDecoration: 'underline'
                      }}
                    >
                      Đăng nhập nhận ưu đãi
                    </button>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Họ và tên hành khách <span style={{ color: 'red' }}>*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nhập họ và tên đầy đủ"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      if (customerErrors.customerName) setCustomerErrors(prev => ({ ...prev, customerName: '' }));
                    }}
                    style={{
                      borderColor: customerErrors.customerName ? '#dc2626' : undefined,
                      backgroundColor: customerErrors.customerName ? '#fff5f5' : undefined
                    }}
                  />
                  {customerErrors.customerName && (
                    <div style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '4px', fontWeight: '500' }}>
                      {customerErrors.customerName}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Số điện thoại <span style={{ color: 'red' }}>*</span></label>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="Nhập số điện thoại liên hệ"
                    value={customerPhone}
                    onChange={(e) => {
                      setCustomerPhone(e.target.value);
                      if (customerErrors.customerPhone) setCustomerErrors(prev => ({ ...prev, customerPhone: '' }));
                    }}
                    style={{
                      borderColor: customerErrors.customerPhone ? '#dc2626' : undefined,
                      backgroundColor: customerErrors.customerPhone ? '#fff5f5' : undefined
                    }}
                  />
                  {customerErrors.customerPhone && (
                    <div style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '4px', fontWeight: '500' }}>
                      {customerErrors.customerPhone}
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div className="form-group">
                    <label className="form-label">Năm sinh <span style={{ color: 'red' }}>*</span></label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Nhập năm sinh"
                      value={customerBirthYear}
                      onChange={(e) => {
                        setCustomerBirthYear(e.target.value);
                        if (customerErrors.customerBirthYear) setCustomerErrors(prev => ({ ...prev, customerBirthYear: '' }));
                      }}
                      style={{
                        borderColor: customerErrors.customerBirthYear ? '#dc2626' : undefined,
                        backgroundColor: customerErrors.customerBirthYear ? '#fff5f5' : undefined
                      }}
                    />
                    {customerErrors.customerBirthYear && (
                      <div style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '4px', fontWeight: '500' }}>
                        {customerErrors.customerBirthYear}
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Số căn cước (CCCD) <span style={{ color: 'red' }}>*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Nhập số CCCD"
                      value={customerCCCD}
                      onChange={(e) => {
                        setCustomerCCCD(e.target.value);
                        if (customerErrors.customerCCCD) setCustomerErrors(prev => ({ ...prev, customerCCCD: '' }));
                      }}
                      style={{
                        borderColor: customerErrors.customerCCCD ? '#dc2626' : undefined,
                        backgroundColor: customerErrors.customerCCCD ? '#fff5f5' : undefined
                      }}
                    />
                    {customerErrors.customerCCCD && (
                      <div style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '4px', fontWeight: '500' }}>
                        {customerErrors.customerCCCD}
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Email (Không bắt buộc - nhận thông tin hóa đơn)</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="email@example.com"
                    value={customerEmail}
                    onChange={(e) => {
                      setCustomerEmail(e.target.value);
                      if (customerErrors.customerEmail) setCustomerErrors(prev => ({ ...prev, customerEmail: '' }));
                    }}
                    style={{
                      borderColor: customerErrors.customerEmail ? '#dc2626' : undefined,
                      backgroundColor: customerErrors.customerEmail ? '#fff5f5' : undefined
                    }}
                  />
                  {customerErrors.customerEmail && (
                    <div style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '4px', fontWeight: '500' }}>
                      {customerErrors.customerEmail}
                    </div>
                  )}
                </div>

                {/* Sử dụng điểm tích lũy thành viên (Chỉ hiển thị khi có đăng nhập) */}
                {isAuthenticated && user && !isGuestBooking && (
                  <div style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    marginTop: '5px'
                  }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '700', color: '#1e293b', fontSize: '0.88rem' }}>
                      <input
                        type="checkbox"
                        checked={usePoints}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setUsePoints(checked);
                          if (checked) {
                            const curTrip = trips.find(t => t._id === expandedTripId);
                            const origTotal = (curTrip?.price || 0) * selectedSeats.length;
                            setPointsInput(Math.min(user.points || 0, origTotal));
                          } else {
                            setPointsInput(0);
                          }
                        }}
                        style={{ accentColor: '#16a34a' }}
                      />
                      Sử dụng điểm tích lũy (Bạn có: {(user.points || 0).toLocaleString('vi-VN')} điểm)
                    </label>

                    {usePoints && (
                      <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.8rem', color: '#475569' }}>Số điểm sử dụng:</span>
                        <input
                          type="number"
                          min="0"
                          max={Math.min(user.points || 0, Math.max(0, (trip.price * selectedSeats.length) - getVoucherDiscountAmount(appliedVoucher, trip.price * selectedSeats.length)))}
                          value={pointsInput}
                          onChange={(e) => {
                            const maxLimit = Math.min(user.points || 0, Math.max(0, (trip.price * selectedSeats.length) - getVoucherDiscountAmount(appliedVoucher, trip.price * selectedSeats.length)));
                            const val = Math.max(0, Math.min(Number(e.target.value) || 0, maxLimit));
                            setPointsInput(val);
                          }}
                          className="form-control"
                          style={{ width: '130px', padding: '6px 10px', fontSize: '0.85rem', fontWeight: '700' }}
                        />
                        <span style={{ fontSize: '0.82rem', color: '#15803d', fontWeight: '700' }}>
                          Giảm trừ: -{Number(pointsInput || 0).toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* ─── Mục Sử Dụng Voucher / Mã Khuyến Mãi (Chỉ hiển thị khi có đăng nhập) ─── */}
                {isAuthenticated && user && !isGuestBooking && (
                <div style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  marginTop: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '0.88rem' }}>
                      Mã Giảm Giá / Voucher Ưu Đãi
                    </div>
                    {appliedVoucher && (
                      <button
                        type="button"
                        onClick={handleRemoveVoucher}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#dc2626',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        Bỏ áp dụng
                      </button>
                    )}
                  </div>

                  {voucherError && (
                    <div style={{
                      padding: '6px 10px',
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '6px',
                      color: '#dc2626',
                      fontSize: '0.78rem',
                      marginBottom: '8px'
                    }}>
                      {voucherError}
                    </div>
                  )}

                  {appliedVoucher && (
                    <div style={{
                      padding: '8px 12px',
                      background: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      borderRadius: '6px',
                      marginBottom: '10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#065f46' }}>
                          Mã đã áp dụng: {appliedVoucher.code}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#047857', marginTop: '2px' }}>
                          {appliedVoucher.title || appliedVoucher.description}
                        </div>
                      </div>
                      <span style={{ fontSize: '0.88rem', fontWeight: '800', color: '#047857' }}>
                        -{formatCurrency(getVoucherDiscountAmount(appliedVoucher, trip.price * selectedSeats.length))}
                      </span>
                    </div>
                  )}

                  {/* Danh sách các voucher ưu đãi khả dụng */}
                  <div style={{ fontSize: '0.76rem', color: '#475569', fontWeight: '600', marginBottom: '6px' }}>
                    Ưu đãi dành riêng cho bạn:
                  </div>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    maxHeight: '170px',
                    overflowY: 'auto',
                    paddingRight: '4px',
                    marginBottom: '8px'
                  }}>
                    {promotionsList.length > 0 ? (
                      promotionsList.map((promo) => {
                        const isSelected = appliedVoucher?.code === promo.code;
                        const currentOrderVal = trip.price * selectedSeats.length;
                        const isEligible = !promo.minOrderValue || currentOrderVal >= promo.minOrderValue;
                        return (
                          <div
                            key={promo._id || promo.code}
                            style={{
                              padding: '8px 10px',
                              borderRadius: '6px',
                              border: isSelected ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                              backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              opacity: isEligible ? 1 : 0.6
                            }}
                          >
                            <div style={{ flex: 1, paddingRight: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <span style={{
                                  background: '#e0e7ff',
                                  color: '#3730a3',
                                  fontSize: '0.72rem',
                                  fontWeight: '800',
                                  padding: '1px 6px',
                                  borderRadius: '4px'
                                }}>
                                  {promo.code}
                                </span>
                                <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#1e293b' }}>
                                  {promo.discountType === 'percentage'
                                    ? `Giảm ${promo.discountValue}% (tối đa ${formatCurrency(promo.maxDiscountAmount || 0)})`
                                    : `Giảm ${formatCurrency(promo.discountValue)}`}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                                {promo.minOrderValue ? `Đơn tối thiểu ${formatCurrency(promo.minOrderValue)}` : 'Không giới hạn đơn tối thiểu'}
                              </div>
                            </div>

                            <button
                              type="button"
                              disabled={!isEligible || isSelected}
                              onClick={() => handleApplyVoucher(promo, currentOrderVal)}
                              style={{
                                padding: '4px 10px',
                                fontSize: '0.72rem',
                                fontWeight: '700',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: isEligible && !isSelected ? 'pointer' : 'default',
                                background: isSelected ? '#16a34a' : (isEligible ? '#2563eb' : '#cbd5e1'),
                                color: '#ffffff',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {isSelected ? 'Đang dùng' : 'Áp dụng'}
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', padding: '4px 0' }}>
                        Không có voucher nào phù hợp.
                      </div>
                    )}
                  </div>

                  {/* Input nhập mã tùy ý */}
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                    <input
                      type="text"
                      placeholder="Hoặc nhập mã voucher khác..."
                      value={customVoucherCode}
                      onChange={(e) => setCustomVoucherCode(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        fontSize: '0.78rem',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        outline: 'none',
                        textTransform: 'uppercase'
                      }}
                    />
                    <button
                      type="button"
                      onClick={(e) => handleApplyCustomCode(e, trip.price * selectedSeats.length)}
                      style={{
                        padding: '6px 14px',
                        fontSize: '0.78rem',
                        fontWeight: '700',
                        backgroundColor: '#1e293b',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Áp dụng
                    </button>
                  </div>
                </div>
                )}

                <div style={{ display: 'flex', gap: '15px', marginTop: '1rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: '12px' }}
                    onClick={() => setBookingStep('seats')}
                  >
                    Quay lại
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '12px' }}
                  >
                    Tiếp tục
                  </button>
                </div>
              </form>
            </div>

            {/* Sidebar Summary */}
            <div className="booking-sidebar" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h4 style={{ fontWeight: '700', marginBottom: '1.25rem' }}>Chi tiết đặt chỗ</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Ghế đã chọn:</span>
                  <span style={{ fontWeight: '700', color: 'var(--primary)' }}>{selectedSeats.join(', ')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Điểm đón:</span>
                  <span style={{ fontWeight: '600', textAlign: 'right', fontSize: '0.9rem' }}>{selectedPickup}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Điểm trả:</span>
                  <span style={{ fontWeight: '600', textAlign: 'right', fontSize: '0.9rem' }}>{selectedDropoff}</span>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Giá vé gốc:</span>
                  <span style={{ fontWeight: '600' }}>
                    {formatCurrency(trip.price * selectedSeats.length)}
                  </span>
                </div>
                {(!isGuestBooking && appliedVoucher) && getVoucherDiscountAmount(appliedVoucher, trip.price * selectedSeats.length) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', color: '#2563eb' }}>
                    <span>Giảm voucher ({appliedVoucher.code}):</span>
                    <span style={{ fontWeight: '700' }}>
                      -{formatCurrency(getVoucherDiscountAmount(appliedVoucher, trip.price * selectedSeats.length))}
                    </span>
                  </div>
                )}
                {(!isGuestBooking && usePoints) && Number(pointsInput) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', color: '#15803d' }}>
                    <span>Giảm từ điểm tích lũy:</span>
                    <span style={{ fontWeight: '700' }}>
                      -{formatCurrency(Number(pointsInput))}
                    </span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                  <span style={{ fontWeight: '700' }}>Tạm tính cần thanh toán:</span>
                  <span style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--accent)' }}>
                    {formatCurrency(
                      (!isGuestBooking)
                        ? Math.max(0, (trip.price * selectedSeats.length) - getVoucherDiscountAmount(appliedVoucher, trip.price * selectedSeats.length) - (usePoints ? Number(pointsInput || 0) : 0))
                        : (trip.price * selectedSeats.length)
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : bookingStep === 'payment' ? (
          <div className="booking-layout">
            {/* PayOS QR Payment Screen */}
            <div>
              <h4 style={{ fontWeight: '700', marginBottom: '1.25rem', textAlign: 'center' }}>Thanh Toán Vé Xe</h4>

              <div className="glass-card" style={{ padding: '1.5rem', backgroundColor: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: '12px', textAlign: 'center', maxWidth: '400px', margin: '0 auto' }}>
                {createdBooking?.totalAmount === 0 ? (
                  <div style={{ padding: '1.25rem 0' }}>
                    <div style={{ fontWeight: '800', color: '#15803d', fontSize: '1.15rem', marginBottom: '8px' }}>
                      Thanh Toán Thành Công Bằng Điểm Tích Lũy
                    </div>
                    <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                      Vé xe đã được thanh toán 100% bằng điểm tích lũy ({createdBooking?.pointsUsed?.toLocaleString('vi-VN')} điểm). Ghế ngồi của quý khách đã được xác nhận thành công trên hệ thống.
                    </p>
                    <button
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '12px 14px', fontWeight: '700' }}
                      onClick={() => navigate('/my-tickets')}
                    >
                      Xem Danh Sách Vé Của Tôi
                    </button>
                  </div>
                ) : (
                  <>
                    <p style={{ fontWeight: '700', color: 'var(--primary)', marginBottom: '12px' }}>QUÉT MÃ THANH TOÁN VIETQR (PAYOS)</p>

                    {(() => {
                      const payosAcc = createdBooking?.payosData?.accountNumber || '0919210046';
                      const payosQr = createdBooking?.payosData?.qrCode
                        ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(createdBooking.payosData.qrCode)}`
                        : `https://img.vietqr.io/image/MB-${payosAcc}-compact2.png?amount=${createdBooking?.totalAmount ?? (trip.price * selectedSeats.length)}&addInfo=SmartBus%20${createdBooking?.orderCode}&accountName=HO%20VAN%20LOC`;

                      return (
                        <>
                          <img
                            src={payosQr}
                            alt="VietQR PayOS"
                            style={{ width: '100%', maxWidth: '220px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', marginBottom: '1rem' }}
                          />

                          <div style={{ textAlign: 'left', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '6px', margin: '0 auto', maxWidth: '300px' }}>
                            <div>Ngân hàng: <strong>MBBank (Ngân hàng Quân Đội)</strong></div>
                            <div>Số tài khoản: <strong>{payosAcc}</strong></div>
                            <div>Chủ tài khoản: <strong>{createdBooking?.payosData?.accountName || 'HO VAN LOC'}</strong></div>
                            <div>Số tiền: <strong style={{ color: 'var(--accent)' }}>{formatCurrency(createdBooking?.totalAmount ?? (trip.price * selectedSeats.length))}</strong></div>
                            <div>Nội dung chuyển khoản: <strong style={{ color: 'var(--primary)' }}>SmartBus {createdBooking?.orderCode}</strong></div>
                          </div>

                          {createdBooking?.payosData?.checkoutUrl && (
                            <div style={{ marginTop: '12px' }}>
                              <a
                                href={createdBooking.payosData.checkoutUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-primary"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '8px',
                                  width: '100%',
                                  padding: '10px 14px',
                                  fontSize: '0.85rem',
                                  fontWeight: '700',
                                  borderRadius: '8px',
                                  textDecoration: 'none'
                                }}
                              >
                                <span>Mở trang thanh toán PayOS trực tiếp</span>
                                <ArrowRight size={15} />
                              </a>
                            </div>
                          )}
                        </>
                      );
                    })()}

                    <div style={{
                      marginTop: '1.25rem',
                      padding: '12px 14px',
                      backgroundColor: '#eff6ff',
                      borderRadius: '10px',
                      border: '1px solid #bfdbfe',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      textAlign: 'left'
                    }}>
                      <div className="payment-pulse-spinner" />
                      <div style={{ fontSize: '0.8rem', color: '#1e40af', lineHeight: 1.45, flex: 1 }}>
                        <strong style={{ display: 'block', color: '#1e3a8a', fontWeight: '700', marginBottom: '2px' }}>Đang chờ nhận chuyển khoản VietQR...</strong>
                        Hệ thống sẽ tự động xác nhận và xuất hóa đơn điện tử ngay khi bạn hoàn tất chuyển tiền.
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Pay Later Option Sidebar */}
            <div className="booking-sidebar" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h4 style={{ fontWeight: '700', marginBottom: '1.25rem' }}>Lựa chọn thanh toán</h4>

                {/* Thanh Toán Sau: CHỈ DÀNH CHO THÀNH VIÊN ĐÃ ĐĂNG NHẬP, KHÁCH VÃNG LAI ẨN HOÀN TOÀN */}
                {(!isGuestBooking && isAuthenticated) ? (
                  createdBooking?.totalAmount > 0 && (() => {
                    const ct = trips.find(t => t._id === expandedTripId);
                    const hoursUntilDep = ct ? (new Date(ct.departureTime) - new Date()) / 3600000 : 999;
                    const payLaterAllowed = hoursUntilDep >= 24;
                    return (
                      <div className="glass-card" style={{ padding: '1.25rem', border: `1px solid ${payLaterAllowed ? '#fed7aa' : '#fecaca'}`, backgroundColor: payLaterAllowed ? '#fff7ed' : '#fef2f2', borderRadius: '8px', marginBottom: '1.5rem' }}>
                        <h5 style={{ fontWeight: '700', color: payLaterAllowed ? '#c2410c' : '#991b1b', fontSize: '0.95rem', marginBottom: '6px' }}>Hoặc Thanh Toán Sau (Trong 5 ngày)</h5>
                        {payLaterAllowed ? (
                          <>
                            <p style={{ fontSize: '0.85rem', color: '#9a3412', margin: 0 }}>
                              Bạn có thể giữ chỗ trước và hoàn tất chuyển khoản trong vòng 5 ngày. Nếu quá thời hạn hệ thống sẽ tự động hủy vé.
                            </p>
                            <button
                              className="btn btn-secondary"
                              style={{ width: '100%', marginTop: '12px', border: '1px solid #ef6c00', color: '#ef6c00', backgroundColor: '#ffffff', fontWeight: '700' }}
                              onClick={handleConfirmPayLater}
                            >
                              Chọn Thanh Toán Sau
                            </button>
                          </>
                        ) : (
                          <>
                            <p style={{ fontSize: '0.85rem', color: '#991b1b', margin: '0 0 6px 0', fontWeight: '600' }}>
                              Không thể thanh toán sau cho chuyến này.
                            </p>
                            <p style={{ fontSize: '0.8rem', color: '#7f1d1d', margin: 0 }}>
                              Chuyến khởi hành trong {Math.floor(hoursUntilDep)} giờ nữa – phải thanh toán ngay để giữ vé.
                            </p>
                            <button className="btn" style={{ width: '100%', marginTop: '12px', backgroundColor: '#f3f4f6', color: '#9ca3af', cursor: 'not-allowed', fontWeight: '700' }} disabled>
                              Không khả dụng
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <div style={{
                    padding: '12px 14px',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '8px',
                    marginBottom: '1.5rem',
                    fontSize: '0.82rem',
                    color: '#166534',
                    lineHeight: '1.5'
                  }}>
                    ⚡ <strong>Hình thức thanh toán:</strong> Khách vãng lai cần quét mã VietQR bên cạnh để thanh toán trực tuyến và giữ vé ngay lập tức.
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Mã đặt chỗ:</span>
                  <span style={{ fontWeight: '700' }}>#{createdBooking?.orderCode}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Hành khách:</span>
                  <span style={{ fontWeight: '700' }}>{customerName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Số ghế:</span>
                  <span style={{ fontWeight: '700', color: 'var(--primary)' }}>{selectedSeats.join(', ')}</span>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Giá vé gốc:</span>
                  <span style={{ fontWeight: '600' }}>
                    {formatCurrency(createdBooking?.originalAmount || (trip.price * selectedSeats.length))}
                  </span>
                </div>
                {createdBooking?.voucherDiscount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', color: '#2563eb' }}>
                    <span>Giảm từ voucher ({createdBooking.voucherCode}):</span>
                    <span style={{ fontWeight: '700' }}>
                      -{formatCurrency(createdBooking.voucherDiscount)}
                    </span>
                  </div>
                )}
                {createdBooking?.pointsUsed > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', color: '#15803d' }}>
                    <span>Giảm từ điểm tích lũy:</span>
                    <span style={{ fontWeight: '700' }}>
                      -{formatCurrency(createdBooking.pointsUsed)} ({createdBooking.pointsUsed.toLocaleString('vi-VN')} điểm)
                    </span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                  <span style={{ fontWeight: '700' }}>Tổng tiền thanh toán:</span>
                  <span style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--accent)' }}>
                    {formatCurrency(createdBooking?.totalAmount !== undefined ? createdBooking.totalAmount : (trip.price * selectedSeats.length))}
                  </span>
                </div>

                <button
                  className="btn btn-secondary"
                  style={{ width: '100%', padding: '12px', marginTop: '1rem' }}
                  onClick={() => setBookingStep('customer-info')}
                >
                  Quay lại thông tin
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="booking-layout">

            {/* Seat Selector Grid */}
            <div>
              <h4 style={{ fontWeight: '700', marginBottom: '1.5rem', textAlign: 'center' }}>Sơ Đồ Ghế Ngồi</h4>

              {/* Grid Layout of seats */}
              {(() => {
                const { lowerFloor, upperFloor, columns } = (trip.busId?.seatLayout && trip.busId.seatLayout.lowerFloor)
                  ? trip.busId.seatLayout
                  : getSeatLayout(trip.busId?.totalSeats || 34, trip.busId?.type || '');
                const hasUpperFloor = upperFloor && upperFloor.length > 0;
                const activeFloor = (selectedFloor === 'upper' && hasUpperFloor) ? 'upper' : 'lower';
                const currentFloorRows = activeFloor === 'lower' ? lowerFloor : upperFloor;

                return (
                  <>
                    {/* Floor Tabs Selector */}
                    {hasUpperFloor && (
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '1.5rem' }}>
                        <button
                          className={`btn ${activeFloor === 'lower' ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ padding: '6px 20px', borderRadius: '20px', fontSize: '0.85rem' }}
                          onClick={() => setSelectedFloor('lower')}
                        >
                          Tầng Dưới (Tầng 1)
                        </button>
                        <button
                          className={`btn ${activeFloor === 'upper' ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ padding: '6px 20px', borderRadius: '20px', fontSize: '0.85rem' }}
                          onClick={() => setSelectedFloor('upper')}
                        >
                          Tầng Trên (Tầng 2)
                        </button>
                      </div>
                    )}

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${columns}, 1fr)`,
                      gap: '14px',
                      maxWidth: '360px',
                      margin: '0 auto',
                      padding: '1.5rem',
                      border: '2px solid var(--border-color)',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(255, 255, 255, 0.6)'
                    }}>
                      {currentFloorRows.flat().map((seat, index) => {
                        if (seat === null) {
                          return <div key={`spacer-${index}`} style={{ height: '56px' }}></div>;
                        }

                        const isBooked = (trip.bookedSeats || []).includes(seat);
                        const isSelected = selectedSeats.includes(seat);
                        const myClientId = getClientId();
                        const lock = lockedSeats[seat];
                        const isLockedByOther = !isBooked && !isSelected && lock && lock.lockedBy !== myClientId && lock.expiresAt > nowTime;

                        let seatBg = 'rgba(59, 130, 246, 0.1)';
                        let seatBorder = 'var(--primary)';
                        let seatColor = 'var(--primary)';
                        let seatTitle = 'Ghế trống - Nhấn để giữ chỗ';

                        if (isBooked) {
                          seatBg = '#e5e7eb';
                          seatBorder = '#d1d5db';
                          seatColor = '#9ca3af';
                          seatTitle = 'Ghế đã bán';
                        } else if (isLockedByOther) {
                          const remainingSec = Math.max(1, Math.round((lock.expiresAt - nowTime) / 1000));
                          seatBg = '#fef3c7';
                          seatBorder = '#f59e0b';
                          seatColor = '#b45309';
                          seatTitle = `Đang được người khác giữ chỗ (còn ${remainingSec}s)`;
                        } else if (isSelected) {
                          seatBg = 'var(--accent)';
                          seatBorder = 'var(--accent)';
                          seatColor = '#ffffff';
                          seatTitle = 'Đang chọn (Giữ chỗ 5 phút)';
                        }

                        return (
                          <button
                            key={seat}
                            disabled={isBooked || isLockedByOther}
                            title={seatTitle}
                            style={{
                              height: '56px',
                              borderRadius: '8px',
                              border: `2px solid ${seatBorder}`,
                              backgroundColor: seatBg,
                              color: seatColor,
                              fontWeight: '700',
                              fontSize: '0.95rem',
                              cursor: (isBooked || isLockedByOther) ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s ease-in-out'
                            }}
                            onClick={() => handleSeatClick(seat, isBooked)}
                          >
                            <span>{seat}</span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                );
              })()}

              {/* Color guide */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '1.5rem', fontSize: '0.85rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '16px', height: '16px', backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '2px solid var(--primary)', borderRadius: '4px' }}></div>
                  <span>Trống</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '16px', height: '16px', backgroundColor: 'var(--accent)', border: '2px solid var(--accent)', borderRadius: '4px' }}></div>
                  <span>Đang chọn</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '16px', height: '16px', backgroundColor: '#fef3c7', border: '2px solid #f59e0b', borderRadius: '4px' }}></div>
                  <span>Đang giữ chỗ (5 phút)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '16px', height: '16px', backgroundColor: '#e5e7eb', border: '2px solid #d1d5db', borderRadius: '4px' }}></div>
                  <span>Đã mua</span>
                </div>
              </div>
            </div>

            {/* Booking checkout details (right panel) */}
            <div className="booking-sidebar" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h4 style={{ fontWeight: '700', marginBottom: '1.25rem' }}>Thông tin đặt vé</h4>

                {/* Countdown timer in sidebar */}
                {selectedSeats.length > 0 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: remainingSeconds <= 60 ? '#fef2f2' : '#f0fdf4',
                    border: `1px solid ${remainingSeconds <= 60 ? '#f87171' : '#86efac'}`,
                    borderRadius: '8px',
                    padding: '8px 12px',
                    marginBottom: '12px'
                  }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: '700', color: remainingSeconds <= 60 ? '#991b1b' : '#166534' }}>
                      Thời gian giữ vé:
                    </span>
                    <span style={{
                      fontSize: '1.05rem',
                      fontWeight: '800',
                      fontFamily: 'monospace',
                      color: remainingSeconds <= 60 ? '#991b1b' : '#15803d',
                      backgroundColor: remainingSeconds <= 60 ? '#fee2e2' : '#dcfce7',
                      padding: '2px 8px',
                      borderRadius: '4px'
                    }}>
                      {formattedCountdown}
                    </span>
                  </div>
                )}

                {/* Selected seats list */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Ghế đã chọn:</span>
                  <span style={{ fontWeight: '700', color: 'var(--primary)' }}>
                    {selectedSeats.length > 0 ? selectedSeats.join(', ') : 'Chưa chọn ghế nào'}
                  </span>
                </div>

                {/* Pickup points dropdown */}
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Chọn điểm đón:</label>
                  <select
                    className="form-control"
                    value={selectedPickup}
                    onChange={(e) => setSelectedPickup(e.target.value)}
                  >
                    {(trip.pickupPoints || []).map((p, idx) => (
                      <option key={idx} value={p.location}>
                        {p.time} - {p.location} ({p.address})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dropoff points dropdown */}
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">Chọn điểm trả:</label>
                  <select
                    className="form-control"
                    value={selectedDropoff}
                    onChange={(e) => setSelectedDropoff(e.target.value)}
                  >
                    {(trip.dropoffPoints || []).map((d, idx) => (
                      <option key={idx} value={d.location}>
                        {d.time} - {d.location} ({d.address})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <span style={{ fontWeight: '700' }}>Tạm tính:</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--accent)' }}>
                    {formatCurrency(trip.price * selectedSeats.length)}
                  </span>
                </div>

                <button
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '12px' }}
                  onClick={handleBookingSubmit}
                >
                  Tiếp tục mua vé
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="placeholder-page animate-fade-in" style={{ paddingBottom: '5rem', backgroundColor: '#f8fafc' }}>

      {/* 1. HERO BANNER */}
      <div
        className="trips-hero-banner"
        style={{
          backgroundImage: `linear-gradient(rgba(10, 25, 47, 0.78), rgba(10, 25, 47, 0.9)), url(${process.env.PUBLIC_URL}/auth_banner.jpg)`
        }}
      >
        <div className="trips-hero-date-badge">
          <Calendar size={15} />
          <span>{formatDateDisplay(dateParam)}</span>
        </div>
        <h1 className="trips-hero-title">
          {fromParam && toParam
            ? `${fromParam} → ${toParam}`
            : fromParam
            ? `${fromParam} → Tất cả điểm đến`
            : toParam
            ? `Tất cả điểm đi → ${toParam}`
            : 'Tất cả chuyến xe trong ngày'}
        </h1>
        <p className="trips-hero-subtitle">
          Tuyến đường vàng cao tốc • Cam kết không đón khách dọc đường • Hoàn tiền nếu trễ
        </p>
      </div>

      {/* 2. RE-SEARCH PANEL (FLOATING OVER HERO) */}
      <div className="trips-search-floating-card">
        <form onSubmit={handleSearchSubmit} className="trips-search-form">
          <div className="trips-search-inputs-grid">
            {/* Điểm đi */}
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

            {/* Điểm đến */}
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

            {/* Ngày đi */}
            <div className="trips-search-field">
              <div className="trips-field-label">
                <Calendar size={13} color="#2563eb" />
                <span>NGÀY ĐI</span>
              </div>
              <div className="trips-field-input-box">
                <input
                  type="date"
                  className="trips-field-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={{ cursor: 'pointer' }}
                  required
                />
              </div>
            </div>

            {/* Số vé */}
            <div className="trips-search-field">
              <div className="trips-field-label">
                <Users size={13} color="#2563eb" />
                <span>SỐ VÉ</span>
              </div>
              <div className="trips-field-input-box">
                <select
                  className="trips-field-input"
                  value={passengers}
                  onChange={(e) => setPassengers(Number(e.target.value))}
                  style={{ cursor: 'pointer' }}
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

            {/* Search Actions */}
            <div className="trips-search-actions">
              <button type="submit" className="trips-btn-search">
                <Search size={17} />
                <span>Tìm xe</span>
              </button>
              <button
                type="button"
                className="trips-btn-reset-search"
                onClick={handleResetSearchAndFilters}
                title="Làm mới bộ lọc tìm kiếm và quay về mặc định"
              >
                <RotateCcw size={15} />
                <span>Làm mới</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="trips-main-container">
        {/* Banner AI gợi ý địa danh */}
        {activeAiBanner && (
          <div style={{
            backgroundColor: '#faf5ff',
            border: '1px solid #d8b4fe',
            borderRadius: '12px',
            padding: '14px 18px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(147, 51, 234, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '38px', height: '38px', borderRadius: '50%',
                backgroundColor: '#9333ea', color: '#ffffff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <Sparkles size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: '800', color: '#581c87', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>AI Đã Tối Ưu Lộ Trình: {activeAiBanner.landmark || activeAiBanner.matchedRoute || activeAiBanner.originalQuery}</span>
                  <span style={{ fontSize: '0.62rem', backgroundColor: '#f3e8ff', color: '#7e22ce', padding: '1px 6px', borderRadius: '4px', border: '1px solid #d8b4fe' }}>
                    TÌM KIẾM THÔNG MINH
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#6b21a8', marginTop: '3px' }}>
                  {activeAiBanner.explanation ? (
                    <span>{activeAiBanner.explanation}</span>
                  ) : (
                    <span>Địa danh thuộc <strong>{activeAiBanner.province}</strong>. Hệ thống tự động lọc các chuyến xe có điểm đón/trả thuận tiện nhất tại <strong>{activeAiBanner.stop || activeAiBanner.canonicalLocation}</strong>.</span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setActiveAiBanner(null)}
              style={{ background: 'none', border: 'none', color: '#9333ea', cursor: 'pointer', fontSize: '1rem', fontWeight: '700', padding: '4px 8px' }}
              title="Đóng thông báo"
            >
              ✕
            </button>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#1e3a8a' }}>Đang tìm kiếm chuyến xe...</div>
          </div>
        ) : error ? (
          <div className="trips-empty-card">
            <AlertCircle size={48} style={{ color: '#ef4444', margin: '0 auto 1rem auto' }} />
            <h3 className="trips-empty-title">Có lỗi xảy ra</h3>
            <p className="trips-empty-desc">{error}</p>
            <button className="btn btn-primary" onClick={() => navigate('/')}>
              Quay lại Trang chủ
            </button>
          </div>
        ) : trips.length === 0 ? (
          <div className="trips-empty-card">
            <div className="trips-empty-icon-box">
              <Calendar size={36} />
            </div>
            <h3 className="trips-empty-title">Không tìm thấy chuyến xe trong ngày {formatDateDisplay(dateParam)}</h3>
            <p className="trips-empty-desc">
              Các chuyến xe trong ngày hôm nay có thể đã xuất bến hết hoặc tuyến đường chưa có chuyến chạy vào khung giờ này.
            </p>

            <div style={{
              margin: '1rem auto 1.5rem',
              padding: '10px 18px',
              backgroundColor: '#f5f3ff',
              borderRadius: '10px',
              border: '1px solid #ddd6fe',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.82rem',
              color: '#6d28d9',
              fontWeight: '600'
            }}>
              <Sparkles size={16} color="#8b5cf6" />
              <span>Hệ thống AI đã ghi nhận nhu cầu chặng này để đề xuất Ban Quản trị xem xét mở tuyến mới!</span>
            </div>

            <div className="trips-empty-actions">
              <button
                type="button"
                className="btn-see-tomorrow"
                onClick={() => {
                  const tomorrow = getTomorrowDate(dateParam);
                  navigate(`/trips?from=${encodeURIComponent(fromParam)}&to=${encodeURIComponent(toParam)}&date=${tomorrow}&passengers=${passengers}&type=${tripType}`);
                }}
              >
                <Calendar size={18} />
                <span>Xem chuyến xe ngày mai ({getTomorrowDate(dateParam)})</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate('/')}
                style={{ padding: '12px 22px', borderRadius: '12px', fontWeight: '700' }}
              >
                Quay lại Trang chủ
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Results Header Bar */}
            <div className="trips-results-header-bar">
              <div className="trips-header-left">
                <span className="trips-count-text">
                  Kết quả tìm kiếm: <span className="trips-count-highlight">{filteredTrips.length} chuyến</span> phù hợp
                </span>
              </div>

              <div className="trips-sort-group">
                <span className="trips-sort-label">SẮP XẾP THEO:</span>
                <div className="trips-sort-tabs">
                  <button
                    type="button"
                    className={`trips-sort-tab-btn ${sortBy === 'time-asc' ? 'active' : ''}`}
                    onClick={() => setSortBy('time-asc')}
                  >
                    Giờ đi sớm nhất
                  </button>
                  <button
                    type="button"
                    className={`trips-sort-tab-btn ${sortBy === 'price-asc' ? 'active' : ''}`}
                    onClick={() => setSortBy('price-asc')}
                  >
                    Giá tăng dần
                  </button>
                </div>
              </div>
            </div>

            {/* Results Grid Layout */}
            <div className="trips-results-grid-layout">
              {/* Trips List or Empty State */}
              <div className="trips-list-column">
                {expandedTripId ? (
                  renderSeatSelectionView()
                ) : filteredTrips.length === 0 ? (
                  <div className="trips-empty-card">
                    <AlertCircle size={48} style={{ color: 'var(--primary)', margin: '0 auto 1rem auto' }} />
                    <h3 className="trips-empty-title">Không tìm thấy chuyến xe phù hợp</h3>
                    <p className="trips-empty-desc">
                      Hiện tại không có chuyến xe nào theo tiêu chí này. Quý khách vui lòng chọn ngày khác hoặc quay lại trang chủ.
                    </p>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '1rem' }}>
                      <button className="btn btn-primary" onClick={handleResetSearchAndFilters}>
                        Làm mới tìm kiếm
                      </button>
                    </div>
                  </div>
                ) : (
                  filteredTrips.map((trip) => {
                  const isExpanded = expandedTripId === trip._id;
                  const remainingSeatsCount = trip.busId.totalSeats - trip.bookedSeats.length;
                  const departureDate = new Date(trip.departureTime);
                  const arrivalDate = new Date(trip.arrivalTime);
                  const typeLow = (trip.busId?.type || '').toLowerCase();
                  const isCabin = typeLow.includes('cabin') || typeLow.includes('cung điện');
                  const isLimo = typeLow.includes('limousine') || typeLow.includes('phòng');
                  const pillClass = isCabin ? 'cabin' : (isLimo ? 'limo' : '');
                  const isBestSeller = (trip.ratings?.average || 4.9) >= 4.8;
                  const durationText = trip.routeId?.duration || '5h 14p';
                  const departureLocation = trip.pickupPoints[0]?.location || fromParam || 'Bến Xe Xuất Phát';
                  const departureAddress = trip.pickupPoints[0]?.address || 'Điểm đón chính';
                  const arrivalLocation = trip.dropoffPoints[trip.dropoffPoints.length - 1]?.location || toParam || 'Bến Xe Đến';
                  const arrivalAddress = trip.dropoffPoints[trip.dropoffPoints.length - 1]?.address || 'Điểm trả chính';

                  // Helper to format hours
                  const formatTime = (dateObj) => {
                    return dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
                  };

                  return (
                    <div key={trip._id} id={`trip-card-${trip._id}`} className="trip-card-luxury animate-fade-in">
                      {/* Top Bar with Real Bus Type & Route */}
                      <div className="trip-card-top-bar">
                        <div className="trip-card-tags-left">
                          <span className={`trip-pill-bus-type ${pillClass}`}>
                            {isLimo ? <Sparkles size={12} /> : <Bus size={12} />}
                            <span>{trip.busId?.type || 'Xe khách'}</span>
                          </span>
                        </div>
                        <div className="trip-card-route-right">
                          <span>Tuyến đường: {trip.routeId?.routeName || `${departureLocation} → ${arrivalLocation}`}</span>
                        </div>
                      </div>

                      {/* Main 3-Column Body */}
                      <div className="trip-card-main-body">
                        {/* 1. Thumbnail Container */}
                        <div className="trip-thumbnail-container">
                          <img
                            src={trip.busId.images[0] || 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=400&q=80'}
                            alt={trip.busId.type}
                            className="trip-thumbnail-img"
                          />
                          <span className="trip-photo-count-badge">
                            <Camera size={11} />
                            <span>{trip.busId.images?.length || 4} ảnh</span>
                          </span>
                        </div>

                        {/* 2. Middle Timeline & Amenities */}
                        <div className="trip-timeline-middle">
                          <div className="trip-timeline-journey">
                            {/* Departure */}
                            <div className="trip-time-point">
                              <div className="trip-point-hour">{formatTime(departureDate)}</div>
                              <span className="trip-point-station" title={departureLocation}>{departureLocation}</span>
                              {departureAddress && <span className="trip-point-address" title={departureAddress}>{departureAddress}</span>}
                            </div>

                            {/* Duration graphic */}
                            <div className="trip-journey-route-graphic">
                              <span className="trip-duration-text">{durationText}</span>
                              <span className="trip-badge-direct">Trực tiếp</span>
                              <div className="trip-connector-line">
                                <span className="trip-connector-dot-start" />
                                <span className="trip-connector-dot-end" />
                              </div>
                            </div>

                            {/* Arrival */}
                            <div className="trip-time-point">
                              <div className="trip-point-hour">{formatTime(arrivalDate)}</div>
                              <span className="trip-point-station" title={arrivalLocation}>{arrivalLocation}</span>
                              {arrivalAddress && <span className="trip-point-address" title={arrivalAddress}>{arrivalAddress}</span>}
                            </div>
                          </div>

                          {/* Amenities from DB with "Xem thêm" */}
                          {trip.busId?.amenities && trip.busId.amenities.length > 0 && (() => {
                            const isExpanded = !!expandedAmenities[trip._id];
                            const allAmenities = trip.busId.amenities;
                            const maxInitial = 4;
                            const visibleAmenities = isExpanded ? allAmenities : allAmenities.slice(0, maxInitial);
                            const remainingCount = allAmenities.length - maxInitial;

                            return (
                              <div className="trip-amenities-row">
                                {visibleAmenities.map((amenity, idx) => {
                                  let icon = <CheckCircle size={13} color="#0284c7" />;
                                  const aLower = (amenity || '').toLowerCase();
                                  if (aLower.includes('wifi')) {
                                    icon = <Wifi size={13} color="#0284c7" />;
                                  } else if (aLower.includes('nước') || aLower.includes('uống') || aLower.includes('ăn')) {
                                    icon = <Utensils size={13} color="#059669" />;
                                  } else if (aLower.includes('sạc') || aLower.includes('usb') || aLower.includes('điện thoại')) {
                                    icon = <Smartphone size={13} color="#7c3aed" />;
                                  } else if (aLower.includes('điều hòa') || aLower.includes('lạnh') || aLower.includes('máy lạnh')) {
                                    icon = <Wind size={13} color="#0891b2" />;
                                  } else if (aLower.includes('tivi') || aLower.includes('tv') || aLower.includes('màn hình')) {
                                    icon = <Tv size={13} color="#2563eb" />;
                                  } else if (aLower.includes('gối') || aLower.includes('chăn') || aLower.includes('nệm')) {
                                    icon = <Coffee size={13} color="#d97706" />;
                                  } else if (aLower.includes('khăn')) {
                                    icon = <Sparkles size={13} color="#059669" />;
                                  }

                                  return (
                                    <span key={idx} className="trip-amenity-item" title={amenity}>
                                      {icon} {amenity}
                                    </span>
                                  );
                                })}

                                {allAmenities.length > maxInitial && (
                                  <button
                                    type="button"
                                    className="trip-amenity-more-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleShowMoreAmenities(trip._id);
                                    }}
                                  >
                                    {isExpanded ? 'Thu gọn' : `+${remainingCount} xem thêm`}
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                        </div>

                        {/* 3. Right Price Column & Action Button */}
                        <div className="trip-card-price-col">
                          <div className="trip-price-info-box">
                            <span className="trip-price-label-small">Giá vé niêm yết</span>
                            <div className={`trip-price-main-big ${isCabin ? 'purple' : ''}`}>
                              {formatCurrency(trip.price)}
                            </div>
                            <span className={`trip-seats-left-pill ${remainingSeatsCount <= 5 ? 'few' : ''}`}>
                              {remainingSeatsCount <= 5 ? `Chỉ còn ${remainingSeatsCount} chỗ` : `Còn ${remainingSeatsCount} chỗ trống`}
                            </span>
                          </div>
                          <button
                            type="button"
                            className={`trip-btn-select-seat ${isCabin ? 'purple' : ''}`}
                            onClick={() => toggleSelectSeats(trip)}
                          >
                            <span>{isExpanded ? 'Đóng sơ đồ' : 'Chọn chỗ'}</span>
                            <ArrowRight size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Card Bottom Bar (Details Toggle) */}
                      <div className="trip-card-bottom-bar">
                        <button
                          type="button"
                          className="trip-toggle-details-btn"
                          onClick={() => toggleDetails(trip._id)}
                        >
                          <span>Thông tin chi tiết</span>
                          {activeDetailsTripId === trip._id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </button>
                      </div>

                      {/* Expandable Details Drawer */}
                      {activeDetailsTripId === trip._id && (
                        <div style={{ borderTop: '1px solid var(--border-color)', backgroundColor: '#fafafa', padding: '1.5rem 1.75rem' }}>
                          {/* Tab Bar headers */}
                          <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.25rem', overflowX: 'auto' }}>
                            {[
                              { id: 'pickup-dropoff', name: 'Điểm đón, trả' },
                              { id: 'amenities', name: 'Tiện ích' },
                              { id: 'reviews', name: 'Đánh giá' }
                            ].map(tab => {
                              const isActive = activeDetailTab === tab.id;
                              return (
                                <button
                                  key={tab.id}
                                  onClick={() => setActiveDetailTab(tab.id)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    borderBottom: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                                    color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                                    fontWeight: isActive ? '700' : '500',
                                    padding: '6px 12px 10px 12px',
                                    cursor: 'pointer',
                                    fontSize: '0.95rem',
                                    whiteSpace: 'nowrap',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  {tab.name}
                                </button>
                              );
                            })}
                          </div>

                          {/* Tab content panel */}
                          {detailsLoading && !loadedTripDetails[trip._id] ? (
                            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                              Đang tải chi tiết chuyến xe...
                            </div>
                          ) : (
                            <div>
                              {(() => {
                                const details = loadedTripDetails[trip._id] || { trip, reviews: [] };
                                const currentTrip = details.trip;
                                const reviewsList = details.reviews;

                                // Tab: Tiện ích từ CSDL
                                if (activeDetailTab === 'amenities') {
                                  const actualAmenities = currentTrip.busId?.amenities || [];
                                  return (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '15px' }} className="animate-fade-in">
                                      {actualAmenities.length === 0 ? (
                                        <p style={{ color: 'var(--text-secondary)' }}>Chưa có thông tin tiện ích chi tiết cho xe này.</p>
                                      ) : (
                                        actualAmenities.map((amenity, idx) => {
                                          let icon = <CheckCircle size={20} color="#2563eb" />;
                                          let desc = 'Tiện ích phục vụ hành khách trên xe';
                                          const aLower = (amenity || '').toLowerCase();
                                          if (aLower.includes('wifi')) {
                                            icon = <Wifi size={20} color="#0284c7" />;
                                            desc = 'Sóng wifi tốc độ cao kết nối ổn định suốt hành trình';
                                          } else if (aLower.includes('nước') || aLower.includes('uống') || aLower.includes('ăn')) {
                                            icon = <Utensils size={20} color="#059669" />;
                                            desc = 'Nước uống / đồ dùng đóng gói hợp vệ sinh';
                                          } else if (aLower.includes('sạc') || aLower.includes('usb') || aLower.includes('điện thoại')) {
                                            icon = <Smartphone size={20} color="#7c3aed" />;
                                            desc = 'Cổng sạc thuận tiện cho thiết bị di động';
                                          } else if (aLower.includes('điều hòa') || aLower.includes('lạnh') || aLower.includes('máy lạnh')) {
                                            icon = <Wind size={20} color="#0891b2" />;
                                            desc = 'Hệ thống điều hòa máy lạnh êm ái thoáng mát';
                                          } else if (aLower.includes('tivi') || aLower.includes('tv') || aLower.includes('màn hình')) {
                                            icon = <Tv size={20} color="#2563eb" />;
                                            desc = 'Màn hình giải trí phục vụ hành khách';
                                          } else if (aLower.includes('gối') || aLower.includes('chăn') || aLower.includes('nệm')) {
                                            icon = <Coffee size={20} color="#d97706" />;
                                            desc = 'Chăn gối sạch sẽ, thơm tho chuẩn nhà xe';
                                          } else if (aLower.includes('khăn')) {
                                            icon = <Sparkles size={20} color="#059669" />;
                                            desc = 'Khăn lạnh sạch sẽ đóng gói riêng';
                                          }

                                          return (
                                            <div key={idx} style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '12px',
                                              border: '1px solid var(--border-color)',
                                              borderRadius: '8px',
                                              padding: '12px 16px',
                                              backgroundColor: '#ffffff'
                                            }}>
                                              <div style={{ flexShrink: 0 }}>
                                                {icon}
                                              </div>
                                              <div>
                                                <h5 style={{ fontWeight: '700', margin: '0 0 2px 0', fontSize: '0.95rem' }}>{amenity}</h5>
                                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>{desc}</p>
                                              </div>
                                            </div>
                                          );
                                        })
                                      )}
                                    </div>
                                  );
                                }

                                // Tab 3: Điểm đón, trả
                                if (activeDetailTab === 'pickup-dropoff') {
                                  return (
                                    <div className="timeline-layout animate-fade-in">
                                      {/* Pickup timeline */}
                                      <div>
                                        <h5 style={{ fontWeight: '700', color: 'var(--primary)', borderBottom: '2px solid rgba(59,130,246,0.1)', paddingBottom: '8px', marginBottom: '15px' }}>
                                          Điểm đón
                                        </h5>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', position: 'relative', paddingLeft: '20px', borderLeft: '2px solid var(--border-color)' }}>
                                          {currentTrip.pickupPoints.map((point, idx) => (
                                            <div key={idx} style={{ position: 'relative' }}>
                                              {/* Bullet icon */}
                                              <div style={{
                                                position: 'absolute',
                                                left: '-26px',
                                                top: '4px',
                                                width: '10px',
                                                height: '10px',
                                                borderRadius: '50%',
                                                backgroundColor: 'var(--primary)',
                                                border: '2px solid #ffffff'
                                              }}></div>
                                              <span style={{ fontWeight: '700', fontSize: '0.9rem', marginRight: '8px' }}>{point.time}</span>
                                              <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>• {point.location}</span>
                                              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{point.address}</p>
                                            </div>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Dropoff timeline */}
                                      <div>
                                        <h5 style={{ fontWeight: '700', color: 'var(--accent)', borderBottom: '2px solid rgba(249,115,22,0.1)', paddingBottom: '8px', marginBottom: '15px' }}>
                                          Điểm trả
                                        </h5>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', position: 'relative', paddingLeft: '20px', borderLeft: '2px solid var(--border-color)' }}>
                                          {currentTrip.dropoffPoints.map((point, idx) => (
                                            <div key={idx} style={{ position: 'relative' }}>
                                              {/* Bullet icon */}
                                              <div style={{
                                                position: 'absolute',
                                                left: '-26px',
                                                top: '4px',
                                                width: '10px',
                                                height: '10px',
                                                borderRadius: '50%',
                                                backgroundColor: 'var(--accent)',
                                                border: '2px solid #ffffff'
                                              }}></div>
                                              <span style={{ fontWeight: '700', fontSize: '0.9rem', marginRight: '8px' }}>{point.time}</span>
                                              <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>• {point.location}</span>
                                              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{point.address}</p>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }

                                // Tab 3: Đánh giá
                                if (activeDetailTab === 'reviews') {
                                  const totalReviewsCount = reviewsList.length;
                                  const avgRating = totalReviewsCount > 0
                                    ? (reviewsList.reduce((acc, curr) => acc + curr.rating, 0) / totalReviewsCount).toFixed(1)
                                    : (currentTrip.ratings?.average || 5.0).toFixed(1);
                                  const totalCount = totalReviewsCount > 0 ? totalReviewsCount : (currentTrip.ratings?.count || 0);

                                  return (
                                    <div className="animate-fade-in">
                                      {/* Overall Rating Section */}
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '30px', backgroundColor: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '15px 25px', marginBottom: '20px' }}>
                                        <div style={{ textAlign: 'center' }}>
                                          <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--primary)', lineHeight: '1' }}>{avgRating}</div>
                                          <div style={{ display: 'flex', gap: '2px', margin: '6px 0', color: '#eab308' }}>
                                            {[1, 2, 3, 4, 5].map(star => (
                                              <Star key={star} size={16} fill={star <= Math.round(parseFloat(avgRating)) ? '#eab308' : 'none'} stroke="#eab308" />
                                            ))}
                                          </div>
                                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>({totalCount} đánh giá)</div>
                                        </div>

                                        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                          {[5, 4, 3, 2, 1].map(stars => {
                                            const countOfStars = reviewsList.filter(r => r.rating === stars).length;
                                            const percentage = totalReviewsCount > 0 ? Math.round((countOfStars / totalReviewsCount) * 100) : 0;

                                            return (
                                              <div key={stars} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                                                <span style={{ width: '40px', textAlign: 'right' }}>{stars} sao</span>
                                                <div style={{ flexGrow: 1, height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                                                  <div style={{ width: `${percentage}%`, height: '100%', backgroundColor: 'var(--primary)' }}></div>
                                                </div>
                                                <span style={{ width: '35px', color: 'var(--text-secondary)' }}>{percentage}%</span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>

                                      {/* Reviews List */}
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        {reviewsList.length === 0 ? (
                                          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>Chưa có nhận xét nào cho chuyến xe này.</p>
                                        ) : (
                                          reviewsList.map((rev) => (
                                            <div key={rev._id} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '15px' }}>
                                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                                <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>{rev.userName}</span>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(rev.createdAt).toLocaleDateString('vi-VN')}</span>
                                              </div>
                                              <div style={{ display: 'flex', gap: '2px', marginBottom: '8px', color: '#eab308' }}>
                                                {[1, 2, 3, 4, 5].map(star => (
                                                  <Star key={star} size={14} fill={star <= rev.rating ? '#eab308' : 'none'} stroke="#eab308" />
                                                ))}
                                              </div>
                                              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.4', margin: '0' }}>{rev.comment}</p>
                                            </div>
                                          ))
                                        )}
                                      </div>
                                    </div>
                                  );
                                }

                                return null;
                              })()}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Lower Expandable Seat Map & Point selection */}
                      {isExpanded && (
                        <div style={{ borderTop: '1px solid var(--border-color)', backgroundColor: 'rgba(255, 255, 255, 0.4)', padding: '2rem' }} className="animate-fade-in">
                          {bookingSuccess ? (
                            <div style={{ textAlign: 'center', padding: '2rem' }}>
                              <CheckCircle size={56} style={{ color: '#22c55e', marginBottom: '1rem' }} />
                              <h3 style={{ color: '#22c55e', fontWeight: '700' }}>ĐẶT GHẾ THÀNH CÔNG!</h3>
                              <p style={{ marginTop: '0.75rem', color: 'var(--text-secondary)' }}>
                                Cảm ơn bạn **{user?.name || 'khách hàng'}** đã đặt chỗ. Vé xe của bạn đã được ghi nhận trên hệ thống.
                              </p>
                              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                Mã số ghế của bạn là: **{selectedSeats.join(', ')}**
                              </p>
                              <button
                                className="btn btn-primary"
                                style={{ marginTop: '1.5rem' }}
                                onClick={() => {
                                  setBookingSuccess(false);
                                  setExpandedTripId(null);
                                  setSelectedSeats([]);
                                }}
                              >
                                Tiếp tục tìm chuyến khác
                              </button>
                            </div>
                          ) : (
                            <div className="booking-layout">

                              {/* Seat Selector Grid */}
                              <div>
                                <h4 style={{ fontWeight: '700', marginBottom: '1.25rem', textAlign: 'center' }}>Sơ Đồ Ghế Ngồi</h4>

                                {/* Grid Layout of seats */}
                                {(() => {
                                  const { lowerFloor, upperFloor, columns } = (trip.busId?.seatLayout && trip.busId.seatLayout.lowerFloor)
                                    ? trip.busId.seatLayout
                                    : getSeatLayout(trip.busId.totalSeats, trip.busId.type || '');
                                  const hasUpperFloor = upperFloor && upperFloor.length > 0;
                                  const activeFloor = (selectedFloor === 'upper' && hasUpperFloor) ? 'upper' : 'lower';
                                  const currentFloorRows = activeFloor === 'lower' ? lowerFloor : upperFloor;

                                  return (
                                    <>
                                      {/* Floor Tabs Selector */}
                                      {hasUpperFloor && (
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '1.5rem' }}>
                                          <button
                                            className={`btn ${activeFloor === 'lower' ? 'btn-primary' : 'btn-secondary'}`}
                                            style={{ padding: '6px 16px', borderRadius: '20px', fontSize: '0.85rem' }}
                                            onClick={() => setSelectedFloor('lower')}
                                          >
                                            Tầng Dưới (A)
                                          </button>
                                          <button
                                            className={`btn ${activeFloor === 'upper' ? 'btn-primary' : 'btn-secondary'}`}
                                            style={{ padding: '6px 16px', borderRadius: '20px', fontSize: '0.85rem' }}
                                            onClick={() => setSelectedFloor('upper')}
                                          >
                                            Tầng Trên (B)
                                          </button>
                                        </div>
                                      )}

                                      <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: `repeat(${columns}, 1fr)`,
                                        gap: '14px',
                                        maxWidth: '360px',
                                        margin: '0 auto',
                                        padding: '1rem',
                                        border: '2px solid var(--border-color)',
                                        borderRadius: '12px',
                                        backgroundColor: 'rgba(255, 255, 255, 0.6)'
                                      }}>
                                        {currentFloorRows.flat().map((seat, index) => {
                                          if (seat === null) {
                                            return <div key={`spacer-${index}`} style={{ height: '56px' }}></div>;
                                          }

                                          const isBooked = (trip.bookedSeats || []).includes(seat);
                                          const isSelected = selectedSeats.includes(seat);
                                          const myClientId = getClientId();
                                          const lock = lockedSeats[seat];
                                          const isLockedByOther = !isBooked && !isSelected && lock && lock.lockedBy !== myClientId && lock.expiresAt > nowTime;

                                          let seatBg = 'rgba(59, 130, 246, 0.1)'; // Blue light tint for available
                                          let seatBorder = 'var(--primary)';
                                          let seatColor = 'var(--primary)';
                                          let seatTitle = 'Ghế trống - Nhấn để giữ chỗ';

                                          if (isBooked) {
                                            seatBg = '#e5e7eb'; // Gray for booked
                                            seatBorder = '#d1d5db';
                                            seatColor = '#9ca3af';
                                            seatTitle = 'Ghế đã bán';
                                          } else if (isLockedByOther) {
                                            const remainingSec = Math.max(1, Math.round((lock.expiresAt - nowTime) / 1000));
                                            seatBg = '#fef3c7';
                                            seatBorder = '#f59e0b';
                                            seatColor = '#b45309';
                                            seatTitle = `Đang được người khác giữ chỗ (còn ${remainingSec}s)`;
                                          } else if (isSelected) {
                                            seatBg = 'var(--accent)'; // Orange/accent for selected
                                            seatBorder = 'var(--accent)';
                                            seatColor = '#ffffff';
                                            seatTitle = 'Đang chọn (Giữ chỗ 5 phút)';
                                          }

                                          return (
                                            <button
                                              key={seat}
                                              disabled={isBooked || isLockedByOther}
                                              title={seatTitle}
                                              style={{
                                                height: '56px',
                                                borderRadius: '8px',
                                                border: `2px solid ${seatBorder}`,
                                                backgroundColor: seatBg,
                                                color: seatColor,
                                                fontWeight: '700',
                                                fontSize: '0.9rem',
                                                cursor: (isBooked || isLockedByOther) ? 'not-allowed' : 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'all 0.2s ease-in-out'
                                              }}
                                              onClick={() => handleSeatClick(seat, isBooked)}
                                            >
                                              <span>{seat}</span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </>
                                  );
                                })()}

                                {/* Color guide */}
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '1.5rem', fontSize: '0.85rem', flexWrap: 'wrap' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div style={{ width: '16px', height: '16px', backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '2px solid var(--primary)', borderRadius: '4px' }}></div>
                                    <span>Trống</span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div style={{ width: '16px', height: '16px', backgroundColor: 'var(--accent)', border: '2px solid var(--accent)', borderRadius: '4px' }}></div>
                                    <span>Đang chọn</span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div style={{ width: '16px', height: '16px', backgroundColor: '#fef3c7', border: '2px solid #f59e0b', borderRadius: '4px' }}></div>
                                    <span>Đang giữ chỗ (5 phút)</span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div style={{ width: '16px', height: '16px', backgroundColor: '#e5e7eb', border: '2px solid #d1d5db', borderRadius: '4px' }}></div>
                                    <span>Đã mua</span>
                                  </div>
                                </div>
                              </div>

                              {/* Booking checkout details (right panel) */}
                              <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                <div>
                                  <h4 style={{ fontWeight: '700', marginBottom: '1.25rem' }}>Thông tin đặt vé</h4>

                                  {/* Countdown timer in sidebar */}
                                  {selectedSeats.length > 0 && (
                                    <div style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      backgroundColor: remainingSeconds <= 60 ? '#fef2f2' : '#f0fdf4',
                                      border: `1px solid ${remainingSeconds <= 60 ? '#f87171' : '#86efac'}`,
                                      borderRadius: '8px',
                                      padding: '8px 12px',
                                      marginBottom: '12px'
                                    }}>
                                      <span style={{ fontSize: '0.78rem', fontWeight: '700', color: remainingSeconds <= 60 ? '#991b1b' : '#166534' }}>
                                        Thời gian giữ vé:
                                      </span>
                                      <span style={{
                                        fontSize: '1.05rem',
                                        fontWeight: '800',
                                        fontFamily: 'monospace',
                                        color: remainingSeconds <= 60 ? '#991b1b' : '#15803d',
                                        backgroundColor: remainingSeconds <= 60 ? '#fee2e2' : '#dcfce7',
                                        padding: '2px 8px',
                                        borderRadius: '4px'
                                      }}>
                                        {formattedCountdown}
                                      </span>
                                    </div>
                                  )}

                                  {/* Selected seats list */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Ghế đã chọn:</span>
                                    <span style={{ fontWeight: '700', color: 'var(--primary)' }}>
                                      {selectedSeats.length > 0 ? selectedSeats.join(', ') : 'Chưa chọn ghế nào'}
                                    </span>
                                  </div>

                                  {/* Pickup points dropdown */}
                                  <div className="form-group" style={{ marginBottom: '12px' }}>
                                    <label className="form-label">Chọn điểm đón:</label>
                                    <select
                                      className="form-control"
                                      value={selectedPickup}
                                      onChange={(e) => setSelectedPickup(e.target.value)}
                                    >
                                      {trip.pickupPoints.map((p, idx) => (
                                        <option key={idx} value={p.location}>
                                          {p.time} - {p.location} ({p.address})
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Dropoff points dropdown */}
                                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                    <label className="form-label">Chọn điểm trả:</label>
                                    <select
                                      className="form-control"
                                      value={selectedDropoff}
                                      onChange={(e) => setSelectedDropoff(e.target.value)}
                                    >
                                      {trip.dropoffPoints.map((d, idx) => (
                                        <option key={idx} value={d.location}>
                                          {d.time} - {d.location} ({d.address})
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>

                                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <span style={{ fontWeight: '700' }}>Tạm tính:</span>
                                    <span style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--accent)' }}>
                                      {formatCurrency(trip.price * selectedSeats.length)}
                                    </span>
                                  </div>

                                  <button
                                    className="btn btn-primary"
                                    style={{ width: '100%', padding: '12px' }}
                                    onClick={handleBookingSubmit}
                                  >
                                    Tiếp tục mua vé
                                  </button>
                                </div>
                              </div>

                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {filteredTrips.length > 0 && (
                <div className="trips-pagination-bar" style={{ textAlign: 'center', margin: '2.5rem auto 1.5rem auto' }}>
                  <span className="trips-pagination-info" style={{ display: 'block', textAlign: 'center', width: '100%' }}>
                    Hiển thị {filteredTrips.length} trong tổng số {trips.length} chuyến xe ngày {new Date(dateParam).toLocaleDateString('vi-VN')}
                  </span>
                  <div className="trips-pagination-controls" style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '10px' }}>
                    <button type="button" className="trips-page-btn" disabled>&lt;</button>
                    <button type="button" className="trips-page-btn active">1</button>
                    <button type="button" className="trips-page-btn">&gt;</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>

      {/* Auth Prompt Modal (Popup) */}
      {showAuthModal && (
        <div style={{
          position: 'fixed',
          left: '0',
          top: '0',
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: '9999'
        }}>
          <div className="glass-card animate-fade-in" style={{ padding: '2.5rem', maxWidth: '440px', backgroundColor: '#ffffff', textAlign: 'center' }}>
            <UserCheck size={48} style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
            <h3 style={{ fontWeight: '700' }}>Đăng Ký / Đăng Nhập</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.75rem', fontSize: '0.95rem', lineHeight: '1.5' }}>
              Để hoàn tất quá trình đặt ghế và tích điểm nhận ưu đãi, bạn vui lòng đăng ký thành viên hoặc đăng nhập tài khoản.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '1.5rem' }}>
              <button
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px', fontWeight: '700', borderRadius: '8px' }}
                onClick={() => {
                  setShowAuthModal(false);
                  navigate('/login');
                }}
              >
                Đăng nhập tài khoản
              </button>
              <button
                className="btn btn-secondary"
                style={{ width: '100%', padding: '12px', fontWeight: '700', borderRadius: '8px' }}
                onClick={() => {
                  setShowAuthModal(false);
                  navigate('/register');
                }}
              >
                Đăng ký thành viên mới
              </button>

              <div style={{
                margin: '10px 0 4px 0',
                position: 'relative',
                textAlign: 'center'
              }}>
                <span style={{
                  background: '#ffffff',
                  padding: '0 10px',
                  color: '#94a3b8',
                  fontSize: '0.78rem',
                  fontWeight: '600',
                  position: 'relative',
                  zIndex: 1
                }}>HOẶC</span>
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: 0,
                  right: 0,
                  borderTop: '1px solid #e2e8f0'
                }} />
              </div>

              <button
                type="button"
                style={{
                  width: '100%',
                  padding: '11px',
                  backgroundColor: '#f8fafc',
                  color: '#1e293b',
                  border: '1.5px dashed #94a3b8',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                  transition: 'all 0.2s'
                }}
                onClick={() => {
                  setIsGuestBooking(true);
                  setAppliedVoucher(null);
                  setUsePoints(false);
                  setPointsInput(0);
                  setShowAuthModal(false);
                  setBookingStep('customer-info');
                }}
              >
                <span>Tiếp tục đặt vé không cần đăng nhập</span>
                <span style={{ fontSize: '0.73rem', color: '#64748b', fontWeight: 'normal' }}>
                  (Khách vãng lai - Không tích điểm & không dùng voucher)
                </span>
              </button>

              <button
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  marginTop: '6px',
                  fontSize: '0.85rem'
                }}
                onClick={() => setShowAuthModal(false)}
              >
                Quay lại chọn ghế
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TripsPage;
