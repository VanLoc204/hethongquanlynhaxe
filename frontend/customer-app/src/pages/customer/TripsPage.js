import React, { useState, useEffect, useRef, useContext } from 'react';
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
  Smartphone
} from 'lucide-react';
import './TripsPage.css';

const API_BASE = 'http://localhost:8000/api/v1/trips';

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
    setFrom(qParams.get('from') || '');
    setTo(qParams.get('to') || '');
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
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingStep, setBookingStep] = useState('seats'); // 'seats', 'customer-info', 'payment'
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerBirthYear, setCustomerBirthYear] = useState('');
  const [customerCCCD, setCustomerCCCD] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [paymentType, setPaymentType] = useState('immediate'); // 'immediate', 'later'
  const [createdBooking, setCreatedBooking] = useState(null);

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
  };

  useEffect(() => {
    const fetchTrips = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get(`${API_BASE}/search?from=${encodeURIComponent(fromParam)}&to=${encodeURIComponent(toParam)}&date=${dateParam}`);
        if (res.data.success) {
          setTrips(res.data.trips);
        } else {
          setError(res.data.message || 'Không tìm thấy chuyến đi nào.');
        }
      } catch (err) {
        console.error('Error fetching trips:', err);
        setError(err.response?.data?.message || 'Có lỗi xảy ra khi tải danh sách chuyến đi.');
      } finally {
        setLoading(false);
      }
    };

    if (fromParam && toParam && dateParam) {
      fetchTrips();
    } else {
      setLoading(false);
      setError('Vui lòng chọn đầy đủ thông tin tìm kiếm ở trang chủ.');
    }
  }, [fromParam, toParam, dateParam]);

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

  // Toggle seat selection
  const handleSeatClick = (seatCode, isBooked) => {
    if (isBooked) return;
    if (selectedSeats.includes(seatCode)) {
      setSelectedSeats(selectedSeats.filter(s => s !== seatCode));
    } else {
      setSelectedSeats([...selectedSeats, seatCode]);
    }
  };

  // Toggle expanded card to view seat map
  const toggleSelectSeats = (trip) => {
    if (expandedTripId === trip._id) {
      setExpandedTripId(null);
      setSelectedSeats([]);
    } else {
      setExpandedTripId(trip._id);
      setSelectedSeats([]);
      setSelectedPickup(trip.pickupPoints[0]?.location || '');
      setSelectedDropoff(trip.dropoffPoints[0]?.location || '');
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
    if (!from || !to || !date) {
      alert('Vui lòng chọn đầy đủ Điểm đi, Điểm đến và Ngày đi.');
      return;
    }
    navigate(`/trips?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${date}&passengers=${passengers}&type=${tripType}`);
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
      setBookingStep('customer-info');
    }
  };

  // Submit passenger details and create pending booking
  const handleCustomerInfoSubmit = async (e) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !customerBirthYear || !customerCCCD) {
      alert('Vui lòng điền đầy đủ các trường thông tin bắt buộc.');
      return;
    }

    const currentTrip = trips.find(t => t._id === expandedTripId);
    if (currentTrip) {
      try {
        const res = await axios.post(`${API_BASE}/book`, {
          tripId: currentTrip._id,
          userId: user?.id || user?._id || 'user_guest',
          seats: selectedSeats,
          pickup: selectedPickup,
          dropoff: selectedDropoff,
          customerName,
          customerPhone,
          customerBirthYear: Number(customerBirthYear),
          customerCCCD,
          customerEmail,
          paymentType: 'immediate'
        });

        if (res.data.success) {
          setCreatedBooking(res.data.booking);
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

  // Webhook Simulation (PayOS Success)
  const handleSimulatePaymentSuccess = async () => {
    if (!createdBooking) return;
    const currentTrip = trips.find(t => t._id === expandedTripId);
    try {
      // Simulate webhook call to backend
      const res = await axios.post(`${API_BASE}/payment/webhook`, {
        code: '00',
        desc: 'success',
        data: {
          orderCode: createdBooking.orderCode,
          amount: currentTrip.price * selectedSeats.length,
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

  // Confirm Pay Later (within 5 days)
  const handleConfirmPayLater = async () => {
    if (!createdBooking) return;
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

  // Apply filters and sorting
  const filteredTrips = trips
    .filter(trip => {
      // 1. Bus Type
      if (busTypeFilter !== 'all') {
        const typeL = trip.busId.type.toLowerCase();
        if (busTypeFilter === 'limousine' && !typeL.includes('limousine') && !typeL.includes('phòng') && !typeL.includes('cabin')) return false;
        if (busTypeFilter === 'sleeper' && !typeL.includes('giường') && !typeL.includes('nằm')) return false;
        if (busTypeFilter === 'seater' && !typeL.includes('ghế') && !typeL.includes('ngồi')) return false;
        if (busTypeFilter === 'cabin' && !typeL.includes('cabin') && !typeL.includes('cung điện')) return false;
      }

      // 2. Giảm giá (Discount check)
      if (isDiscountOnly) {
        const hasDiscount = trip.price < 300000 || trip.ratings.count > 1000;
        if (!hasDiscount) return false;
      }

      // 3. Xe đón tận nơi
      if (isPickupDelivery) {
        const hasDoorToDoor = trip.pickupPoints.some(p => 
          p.location.toLowerCase().includes('tận nơi') || 
          p.location.toLowerCase().includes('trung tâm') ||
          p.location.toLowerCase().includes('văn phòng')
        );
        if (!hasDoorToDoor) return false;
      }

      // 4. Chuyến đêm (21:00 - 05:00)
      if (isNightTrip) {
        const depH = new Date(trip.departureTime).getHours();
        if (!(depH >= 21 || depH <= 5)) return false;
      }

      // 5. Departure hour
      const depHour = new Date(trip.departureTime).getHours();
      if (depHour < startHour || depHour > endHour) return false;

      // 6. Ticket price
      if (trip.price > maxPrice) return false;

      // 7. Available seats count
      const remainingSeats = trip.busId.totalSeats - trip.bookedSeats.length;
      if (remainingSeats < minSeats) return false;

      // 8. Selected Pickup locations
      if (selectedPickups.length > 0) {
        const hasMatchingPickup = trip.pickupPoints.some(p => selectedPickups.includes(p.location));
        if (!hasMatchingPickup) return false;
      }

      // 9. Selected Dropoff locations
      if (selectedDropoffs.length > 0) {
        const hasMatchingDropoff = trip.dropoffPoints.some(d => selectedDropoffs.includes(d.location));
        if (!hasMatchingDropoff) return false;
      }

      return true;
    })
    .sort((a, b) => {
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
        return b.ratings.average - a.ratings.average;
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
      <div className="glass-card animate-fade-in" style={{ padding: '2rem' }}>
        {/* Header with back button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
          <button
            className="btn btn-secondary"
            style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={() => {
              setExpandedTripId(null);
              setSelectedSeats([]);
              setBookingSuccess(false);
            }}
          >
            <ArrowLeft size={16} /> Quay lại danh sách
          </button>
          <div>
            <h3 style={{ margin: 0, fontWeight: 700 }}>Chọn Ghế & Đặt Vé</h3>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Tuyến xe: {trip.routeId?.startPoint} → {trip.routeId?.endPoint} | Khởi hành: {new Date(trip.departureTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ({new Date(trip.departureTime).toLocaleDateString('vi-VN')})
            </span>
          </div>
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
              <form onSubmit={handleCustomerInfoSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '450px', margin: '0 auto' }}>
                <div className="form-group">
                  <label className="form-label">Họ và tên hành khách <span style={{ color: 'red' }}>*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nhập họ và tên đầy đủ"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Số điện thoại <span style={{ color: 'red' }}>*</span></label>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="Nhập số điện thoại liên hệ"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div className="form-group">
                    <label className="form-label">Năm sinh <span style={{ color: 'red' }}>*</span></label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="VD: 2002"
                      value={customerBirthYear}
                      onChange={(e) => setCustomerBirthYear(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Số căn cước (CCCD) <span style={{ color: 'red' }}>*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Nhập số CCCD"
                      value={customerCCCD}
                      onChange={(e) => setCustomerCCCD(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Email (Không bắt buộc - nhận thông tin hóa đơn)</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="email@example.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                  />
                </div>

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

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <span style={{ fontWeight: '700' }}>Tạm tính:</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--accent)' }}>
                    {formatCurrency(trip.price * selectedSeats.length)}
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
                <p style={{ fontWeight: '700', color: 'var(--primary)', marginBottom: '12px' }}>QUÉT MÃ THANH TOÁN VIETQR (PAYOS)</p>

                <img
                  src={`https://img.vietqr.io/image/MB-0919210046-compact2.png?amount=${trip.price * selectedSeats.length}&addInfo=SmartBus%20${createdBooking?.orderCode}&accountName=HO%20VAN%20LOC`}
                  alt="VietQR PayOS"
                  style={{ width: '100%', maxWidth: '220px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', marginBottom: '1rem' }}
                />

                <div style={{ textAlign: 'left', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '6px', margin: '0 auto', maxWidth: '300px' }}>
                  <div>Ngân hàng: <strong>MBBank (Ngân hàng Quân Đội)</strong></div>
                  <div>Số tài khoản: <strong>0919210046</strong></div>
                  <div>Chủ tài khoản: <strong>HO VAN LOC</strong></div>
                  <div>Số tiền: <strong style={{ color: 'var(--accent)' }}>{formatCurrency(trip.price * selectedSeats.length)}</strong></div>
                  <div>Nội dung chuyển khoản: <strong style={{ color: 'var(--primary)' }}>SmartBus {createdBooking?.orderCode}</strong></div>
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
                    Hệ thống tự động kích hoạt PayOS Webhook cập nhật trạng thái sau khi chuyển khoản thành công.
                  </span>
                </div>
              </div>
            </div>

            {/* Pay Later Option Sidebar */}
            <div className="booking-sidebar" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h4 style={{ fontWeight: '700', marginBottom: '1.25rem' }}>Lựa chọn thanh toán</h4>

                {(() => {
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
                })()}

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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <span style={{ fontWeight: '700' }}>Tổng tiền:</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--accent)' }}>
                    {formatCurrency(trip.price * selectedSeats.length)}
                  </span>
                </div>

                <button
                  className="btn btn-secondary"
                  style={{ width: '100%', padding: '12px' }}
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

                        let seatBg = 'rgba(59, 130, 246, 0.1)';
                        let seatBorder = 'var(--primary)';
                        let seatColor = 'var(--primary)';

                        if (isBooked) {
                          seatBg = '#e5e7eb';
                          seatBorder = '#d1d5db';
                          seatColor = '#9ca3af';
                        } else if (isSelected) {
                          seatBg = 'var(--accent)';
                          seatBorder = 'var(--accent)';
                          seatColor = '#ffffff';
                        }

                        return (
                          <button
                            key={seat}
                            disabled={isBooked}
                            style={{
                              height: '56px',
                              borderRadius: '8px',
                              border: `2px solid ${seatBorder}`,
                              backgroundColor: seatBg,
                              color: seatColor,
                              fontWeight: '700',
                              fontSize: '0.95rem',
                              cursor: isBooked ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s ease-in-out'
                            }}
                            onClick={() => handleSeatClick(seat, isBooked)}
                          >
                            {seat}
                          </button>
                        );
                      })}
                    </div>
                  </>
                );
              })()}

              {/* Color guide */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '1.5rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '16px', height: '16px', backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '2px solid var(--primary)', borderRadius: '4px' }}></div>
                  <span>Trống</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '16px', height: '16px', backgroundColor: 'var(--accent)', border: '2px solid var(--accent)', borderRadius: '4px' }}></div>
                  <span>Đang chọn</span>
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
          {fromParam || 'Đà Lạt'} → {toParam || 'Hồ Chí Minh'}
        </h1>
        <p className="trips-hero-subtitle">
          Tuyến đường vàng cao tốc • Cam kết không đón khách dọc đường • Hoàn tiền nếu trễ
        </p>
      </div>

      {/* 2. RE-SEARCH PANEL (FLOATING OVER HERO) */}
      <div className="trips-search-floating-card">
        <form onSubmit={handleSearchSubmit} className="trips-search-form">
          <div className="trips-search-top-row">
            <div className="trips-search-radios">
              <label className="trips-radio-label">
                <input
                  type="radio"
                  name="tripType"
                  value="one-way"
                  checked={tripType === 'one-way'}
                  onChange={() => setTripType('one-way')}
                />
                <span>Một chiều</span>
              </label>
              <label className="trips-radio-label">
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
                  required
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
                  required
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

            {/* Search Button */}
            <button type="submit" className="trips-btn-search">
              <Search size={17} />
              <span>Tìm xe</span>
            </button>
          </div>
        </form>
      </div>

      <div className="trips-main-container">
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
                <span className="trips-sort-label">Sắp xếp theo:</span>
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

            {/* Results Two Columns */}
            <div className="trips-results-grid-layout">
              {/* Left Sidebar Filter */}
              <div className="trips-filter-card">
                <div className="trips-filter-header">
                  <div className="trips-filter-title">
                    <SlidersHorizontal size={18} color="#2563eb" />
                    <span>Bộ lọc tìm kiếm</span>
                  </div>
                  <button type="button" className="trips-filter-reset-btn" onClick={handleClearFilters}>
                    <RotateCcw size={13} />
                    <span>Xóa lọc</span>
                  </button>
                </div>

                {/* 1. Tiêu chí phổ biến */}
                <div className="trips-filter-section">
                  <div className="trips-filter-sec-title">Tiêu chí phổ biến</div>
                  <label className="trips-checkbox-item">
                    <div className="trips-checkbox-label-left">
                      <input
                        type="checkbox"
                        checked={isDiscountOnly}
                        onChange={(e) => setIsDiscountOnly(e.target.checked)}
                      />
                      <span>Giảm giá / Ưu đãi hôm nay</span>
                    </div>
                    <span className="trips-badge-discount">-10%</span>
                  </label>

                  <label className="trips-checkbox-item">
                    <div className="trips-checkbox-label-left">
                      <input
                        type="checkbox"
                        checked={isPickupDelivery}
                        onChange={(e) => setIsPickupDelivery(e.target.checked)}
                      />
                      <span>Xe đón tận nơi</span>
                    </div>
                  </label>

                  <label className="trips-checkbox-item">
                    <div className="trips-checkbox-label-left">
                      <input
                        type="checkbox"
                        checked={isNightTrip}
                        onChange={(e) => setIsNightTrip(e.target.checked)}
                      />
                      <span>Chuyến đêm (21:00 - 05:00)</span>
                    </div>
                  </label>
                </div>

                {/* 2. Giờ đi trong ngày */}
                <div className="trips-filter-section">
                  <div className="trips-filter-sec-title">
                    <span>Giờ đi trong ngày</span>
                    <span style={{ color: '#2563eb', fontWeight: '700' }}>
                      {startHour.toString().padStart(2, '0')}:00 - {endHour === 24 ? '23:59' : `${endHour.toString().padStart(2, '0')}:00`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="24"
                    value={endHour}
                    onChange={(e) => setEndHour(Number(e.target.value))}
                    className="trips-range-input"
                  />
                  <div className="trips-time-slots-grid">
                    <button
                      type="button"
                      className={`trips-time-slot-btn ${activeTimeSlot === 'early' ? 'active' : ''}`}
                      onClick={() => handleTimeSlotClick('early')}
                    >
                      <span className="trips-time-slot-title">Sáng sớm</span>
                      <span className="trips-time-slot-sub">(00h - 06h)</span>
                    </button>
                    <button
                      type="button"
                      className={`trips-time-slot-btn ${activeTimeSlot === 'morning' ? 'active' : ''}`}
                      onClick={() => handleTimeSlotClick('morning')}
                    >
                      <span className="trips-time-slot-title">Buổi sáng</span>
                      <span className="trips-time-slot-sub">(06h - 12h)</span>
                    </button>
                    <button
                      type="button"
                      className={`trips-time-slot-btn ${activeTimeSlot === 'afternoon' ? 'active' : ''}`}
                      onClick={() => handleTimeSlotClick('afternoon')}
                    >
                      <span className="trips-time-slot-title">Buổi chiều</span>
                      <span className="trips-time-slot-sub">(12h - 18h)</span>
                    </button>
                    <button
                      type="button"
                      className={`trips-time-slot-btn ${activeTimeSlot === 'evening' ? 'active' : ''}`}
                      onClick={() => handleTimeSlotClick('evening')}
                    >
                      <span className="trips-time-slot-title">Buổi tối</span>
                      <span className="trips-time-slot-sub">(18h - 24h)</span>
                    </button>
                  </div>
                </div>

                {/* 3. Khoảng giá */}
                <div className="trips-filter-section">
                  <div className="trips-filter-sec-title">
                    <span>Khoảng giá</span>
                    <span style={{ color: '#2563eb', fontWeight: '700' }}>0 đ - {formatCurrency(maxPrice)}</span>
                  </div>
                  <input
                    type="range"
                    min="100000"
                    max="2000000"
                    step="50000"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="trips-range-input"
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#94a3b8' }}>
                    <span>0 đ</span>
                    <span>2.000.000 đ</span>
                  </div>
                </div>

                {/* 4. Loại xe */}
                <div className="trips-filter-section">
                  <div className="trips-filter-sec-title">Loại xe</div>
                  <label className="trips-checkbox-item">
                    <div className="trips-checkbox-label-left">
                      <input
                        type="radio"
                        name="busTypeFilterRadio"
                        checked={busTypeFilter === 'all'}
                        onChange={() => setBusTypeFilter('all')}
                      />
                      <span>Tất cả loại xe</span>
                    </div>
                    <span className="trips-count-badge-gray">({trips.length})</span>
                  </label>
                  <label className="trips-checkbox-item">
                    <div className="trips-checkbox-label-left">
                      <input
                        type="radio"
                        name="busTypeFilterRadio"
                        checked={busTypeFilter === 'sleeper'}
                        onChange={() => setBusTypeFilter('sleeper')}
                      />
                      <span>Giường Nằm 44 Chỗ</span>
                    </div>
                    <span className="trips-count-badge-gray">({sleeperCount})</span>
                  </label>
                  <label className="trips-checkbox-item">
                    <div className="trips-checkbox-label-left">
                      <input
                        type="radio"
                        name="busTypeFilterRadio"
                        checked={busTypeFilter === 'limousine'}
                        onChange={() => setBusTypeFilter('limousine')}
                      />
                      <span>Limousine VIP 34 Phòng</span>
                    </div>
                    <span className="trips-count-badge-gray">({limoCount})</span>
                  </label>
                  <label className="trips-checkbox-item">
                    <div className="trips-checkbox-label-left">
                      <input
                        type="radio"
                        name="busTypeFilterRadio"
                        checked={busTypeFilter === 'cabin'}
                        onChange={() => setBusTypeFilter('cabin')}
                      />
                      <span>Cabin Cung Điện Đôi 22 Phòng</span>
                    </div>
                    <span className="trips-count-badge-gray">({cabinCount})</span>
                  </label>
                  {seaterCount > 0 && (
                    <label className="trips-checkbox-item">
                      <div className="trips-checkbox-label-left">
                        <input
                          type="radio"
                          name="busTypeFilterRadio"
                          checked={busTypeFilter === 'seater'}
                          onChange={() => setBusTypeFilter('seater')}
                        />
                        <span>Xe Ghế Ngồi</span>
                      </div>
                      <span className="trips-count-badge-gray">({seaterCount})</span>
                    </label>
                  )}
                </div>

                {/* 5. Điểm đón */}
                <div className="trips-filter-section">
                  <div className="trips-filter-sec-title">Điểm đón ({fromParam || 'Điểm đi'})</div>
                  <div className="trips-filter-subsearch">
                    <input
                      type="text"
                      placeholder="Tìm điểm đón..."
                      className="trips-filter-subinput"
                      value={pickupSearch}
                      onChange={(e) => setPickupSearch(e.target.value)}
                    />
                    <Search size={13} className="trips-filter-subsearch-icon" />
                  </div>
                  <div className="trips-stops-scroll-list">
                    {filteredPickupLocationsList.length === 0 ? (
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Không tìm thấy điểm đón</span>
                    ) : (
                      filteredPickupLocationsList.map((loc) => {
                        const isChecked = selectedPickups.includes(loc);
                        return (
                          <label key={loc} className="trips-checkbox-item">
                            <div className="trips-checkbox-label-left">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setSelectedPickups(selectedPickups.filter(item => item !== loc));
                                  } else {
                                    setSelectedPickups([...selectedPickups, loc]);
                                  }
                                }}
                              />
                              <span>{loc}</span>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 6. Điểm trả */}
                <div className="trips-filter-section" style={{ borderBottom: 'none' }}>
                  <div className="trips-filter-sec-title">Điểm trả ({toParam || 'Điểm đến'})</div>
                  <div className="trips-filter-subsearch">
                    <input
                      type="text"
                      placeholder="Tìm điểm trả..."
                      className="trips-filter-subinput"
                      value={dropoffSearch}
                      onChange={(e) => setDropoffSearch(e.target.value)}
                    />
                    <Search size={13} className="trips-filter-subsearch-icon" />
                  </div>
                  <div className="trips-stops-scroll-list">
                    {filteredDropoffLocationsList.length === 0 ? (
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Không tìm thấy điểm trả</span>
                    ) : (
                      filteredDropoffLocationsList.map((loc) => {
                        const isChecked = selectedDropoffs.includes(loc);
                        return (
                          <label key={loc} className="trips-checkbox-item">
                            <div className="trips-checkbox-label-left">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setSelectedDropoffs(selectedDropoffs.filter(item => item !== loc));
                                  } else {
                                    setSelectedDropoffs([...selectedDropoffs, loc]);
                                  }
                                }}
                              />
                              <span>{loc}</span>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Right side: Trips List or Empty State */}
              <div className="trips-list-column">
                {expandedTripId ? (
                  renderSeatSelectionView()
                ) : filteredTrips.length === 0 ? (
                  <div className="trips-empty-card">
                    <AlertCircle size={48} style={{ color: 'var(--primary)', margin: '0 auto 1rem auto' }} />
                    <h3 className="trips-empty-title">Không có chuyến xe nào khớp với bộ lọc</h3>
                    <p className="trips-empty-desc">
                      Không tìm thấy kết quả phù hợp. Bạn vui lòng thay đổi hoặc xóa các tiêu chí lọc ở cột bên trái để hiển thị lại chuyến đi.
                    </p>
                    <button className="btn btn-primary" onClick={handleClearFilters}>
                      Xóa tất cả bộ lọc
                    </button>
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
                    <div key={trip._id} className="trip-card-luxury animate-fade-in">
                      {/* Top Bar with Tags & Ratings */}
                      {/* Top Bar with Real Bus Type */}
                      <div className="trip-card-top-bar">
                        <div className="trip-card-tags-left">
                          <span className={`trip-pill-bus-type ${pillClass}`}>
                            💺 {trip.busId?.type || 'Xe khách'}
                          </span>
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

                          {/* Amenities from DB */}
                          {trip.busId?.amenities && trip.busId.amenities.length > 0 && (
                            <div className="trip-amenities-row">
                              {trip.busId.amenities.map((amenity, idx) => {
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
                            </div>
                          )}
                        </div>

                        {/* 3. Right Price Column & Action Button */}
                        <div className="trip-card-price-col">
                          <span className="trip-price-label-small">Giá vé niêm yết</span>
                          <div className={`trip-price-main-big ${isCabin ? 'purple' : ''}`}>
                            {formatCurrency(trip.price)}
                          </div>
                          <span className={`trip-seats-left-pill ${remainingSeatsCount <= 5 ? 'few' : ''}`}>
                            {remainingSeatsCount <= 5 ? `Chỉ còn ${remainingSeatsCount} chỗ` : `Còn ${remainingSeatsCount} chỗ trống`}
                          </span>
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
                              { id: 'policy', name: 'Chính sách' },
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

                                // Tab 4: Chính sách
                                if (activeDetailTab === 'policy') {
                                  return (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="animate-fade-in">
                                      <div style={{ backgroundColor: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '15px' }}>
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                                          <Shield size={20} style={{ color: 'var(--primary)' }} />
                                          <h5 style={{ fontWeight: '700', margin: '0' }}>Chính sách hoàn/hủy vé</h5>
                                        </div>
                                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0' }}>
                                          {currentTrip.policy?.cancellation || 'Yêu cầu hủy vé trước 24 giờ so với giờ khởi hành để được hoàn 100% tiền vé. Hủy vé trong vòng 24 giờ không được hoàn tiền.'}
                                        </p>
                                      </div>

                                      <div style={{ backgroundColor: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '15px' }}>
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                                          <Shield size={20} style={{ color: 'var(--accent)' }} />
                                          <h5 style={{ fontWeight: '700', margin: '0' }}>Chính sách hành lý</h5>
                                        </div>
                                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0' }}>
                                          {currentTrip.policy?.luggage || 'Hành khách được mang theo tối đa 20kg hành lý ký gửi miễn phí. Không mang động vật nuôi hoặc các chất cấm lên xe.'}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                }

                                // Tab 5: Đánh giá
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

                                          const isBooked = trip.bookedSeats.includes(seat);
                                          const isSelected = selectedSeats.includes(seat);

                                          let seatBg = 'rgba(59, 130, 246, 0.1)'; // Blue light tint for available
                                          let seatBorder = 'var(--primary)';
                                          let seatColor = 'var(--primary)';

                                          if (isBooked) {
                                            seatBg = '#e5e7eb'; // Gray for booked
                                            seatBorder = '#d1d5db';
                                            seatColor = '#9ca3af';
                                          } else if (isSelected) {
                                            seatBg = 'var(--accent)'; // Orange/accent for selected
                                            seatBorder = 'var(--accent)';
                                            seatColor = '#ffffff';
                                          }

                                          return (
                                            <button
                                              key={seat}
                                              disabled={isBooked}
                                              style={{
                                                height: '56px',
                                                borderRadius: '8px',
                                                border: `2px solid ${seatBorder}`,
                                                backgroundColor: seatBg,
                                                color: seatColor,
                                                fontWeight: '700',
                                                fontSize: '0.9rem',
                                                cursor: isBooked ? 'not-allowed' : 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'all 0.2s ease-in-out'
                                              }}
                                              onClick={() => handleSeatClick(seat, isBooked)}
                                            >
                                              {seat}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </>
                                  );
                                })()}

                                {/* Color guide */}
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '1.5rem', fontSize: '0.85rem' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div style={{ width: '16px', height: '16px', backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '2px solid var(--primary)', borderRadius: '4px' }}></div>
                                    <span>Trống</span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div style={{ width: '16px', height: '16px', backgroundColor: 'var(--accent)', border: '2px solid var(--accent)', borderRadius: '4px' }}></div>
                                    <span>Đang chọn</span>
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
                <div className="trips-pagination-bar">
                  <span className="trips-pagination-info">
                    Hiển thị {filteredTrips.length} trong tổng số {trips.length} chuyến xe ngày {new Date(dateParam).toLocaleDateString('vi-VN')}
                  </span>
                  <div className="trips-pagination-controls">
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '2rem' }}>
              <button
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px' }}
                onClick={() => {
                  setShowAuthModal(false);
                  navigate('/login');
                }}
              >
                Đăng nhập tài khoản
              </button>
              <button
                className="btn btn-secondary"
                style={{ width: '100%', padding: '12px' }}
                onClick={() => {
                  setShowAuthModal(false);
                  navigate('/register');
                }}
              >
                Đăng ký thành viên mới
              </button>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  marginTop: '8px',
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
