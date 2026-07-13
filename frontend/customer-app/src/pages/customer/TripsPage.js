import React, { useState, useEffect, useContext } from 'react';
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
  ArrowLeft
} from 'lucide-react';

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
  const [busTypeFilter, setBusTypeFilter] = useState('all'); // 'all', '22', '34'
  const [sortBy, setSortBy] = useState('time-asc'); // 'time-asc', 'price-asc', 'price-desc', 'rating-desc'
  const [isDiscountOnly, setIsDiscountOnly] = useState(false);
  const [startHour, setStartHour] = useState(0);
  const [endHour, setEndHour] = useState(24);
  const [maxPrice, setMaxPrice] = useState(2000000);
  const [minSeats, setMinSeats] = useState(0);
  const [pickupSearch, setPickupSearch] = useState('');
  const [selectedPickups, setSelectedPickups] = useState([]);
  const [dropoffSearch, setDropoffSearch] = useState('');
  const [selectedDropoffs, setSelectedDropoffs] = useState([]);

  const handleClearFilters = () => {
    setIsDiscountOnly(false);
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

  // Apply filters and sorting
  const filteredTrips = trips
    .filter(trip => {
      // 1. Bus Type
      if (busTypeFilter !== 'all') {
        const typeL = trip.busId.type.toLowerCase();
        if (busTypeFilter === 'limousine' && !typeL.includes('limousine') && !typeL.includes('phòng') && !typeL.includes('cabin')) return false;
        if (busTypeFilter === 'sleeper' && !typeL.includes('giường') && !typeL.includes('nằm')) return false;
        if (busTypeFilter === 'seater' && !typeL.includes('ghế') && !typeL.includes('ngồi')) return false;
      }
      
      // 2. Giảm giá (Discount check - simulate discount for trips priced < 300,000 or rating counts > 1000)
      if (isDiscountOnly) {
        const hasDiscount = trip.price < 300000 || trip.ratings.count > 1000;
        if (!hasDiscount) return false;
      }

      // 3. Departure hour
      const depHour = new Date(trip.departureTime).getHours();
      if (depHour < startHour || depHour > endHour) return false;

      // 4. Ticket price
      if (trip.price > maxPrice) return false;

      // 5. Available seats count
      const remainingSeats = trip.busId.totalSeats - trip.bookedSeats.length;
      if (remainingSeats < minSeats) return false;

      // 6. Selected Pickup locations
      if (selectedPickups.length > 0) {
        const hasMatchingPickup = trip.pickupPoints.some(p => selectedPickups.includes(p.location));
        if (!hasMatchingPickup) return false;
      }

      // 7. Selected Dropoff locations
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
    <div className="placeholder-page animate-fade-in" style={{ paddingBottom: '5rem' }}>
      
      {/* Search Header Banner */}
      <div className="hero-section-futa" style={{ padding: '3.5rem 1rem 6rem 1rem', borderRadius: '0', minHeight: 'auto', marginBottom: '0', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.85rem', fontWeight: '800', marginBottom: '0.5rem' }}>
          Tuyến xe: {fromParam} → {toParam}
        </h2>
        <p style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', opacity: 0.9 }}>
          <Calendar size={16} />
          {formatDateDisplay(dateParam)}
        </p>
      </div>

      {/* Re-Search Panel */}
      <div className="search-container-futa" style={{ marginTop: '-4.5rem', marginBottom: '2.5rem' }}>
        <form onSubmit={handleSearchSubmit} className="search-box-futa" style={{ boxShadow: '0 8px 30px rgba(0, 0, 0, 0.05)' }}>
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
              <label className="form-label" style={{ fontWeight: '600' }}>Điểm đi</label>
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
              <label className="form-label" style={{ fontWeight: '600' }}>Điểm đến</label>
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
              <label className="form-label" style={{ fontWeight: '600' }}>Ngày đi</label>
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
              <label className="form-label" style={{ fontWeight: '600' }}>Số vé</label>
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

            <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px', height: '48px', marginBottom: '1.25rem', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
              <Search size={18} />
              <span>Tìm chuyến xe</span>
            </button>
          </div>
        </form>
      </div>

      <div className="section-container" style={{ marginTop: '0' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <div className="form-label" style={{ fontSize: '1.2rem' }}>Đang tải danh sách chuyến đi...</div>
          </div>
        ) : error ? (
          <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', borderColor: '#ef4444' }}>
            <AlertCircle size={48} style={{ color: '#ef4444', marginBottom: '1rem' }} />
            <h3>Có lỗi xảy ra</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{error}</p>
            <button className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={() => navigate('/')}>
              Quay lại Trang chủ
            </button>
          </div>
        ) : trips.length === 0 ? (
          <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
            <AlertCircle size={48} style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
            <h3>Không tìm thấy chuyến đi nào</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              Rất tiếc, hiện tại không có chuyến xe nào chạy tuyến đường này vào ngày đã chọn.
            </p>
            <button className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={() => navigate('/')}>
              Quay lại Trang chủ
            </button>
          </div>
        ) : (
          <div className="search-results-layout">
            
            {/* Left side: Filter Panel */}
            <div className="glass-card" style={{ padding: '1.5rem', position: 'sticky', top: '20px', maxHeight: 'calc(100vh - 40px)', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: 0, fontWeight: '700', fontSize: '1.15rem' }}>Bộ lọc tìm kiếm</h3>
                <button 
                  onClick={handleClearFilters}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontWeight: '700',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    padding: '0'
                  }}
                >
                  Xóa lọc
                </button>
              </div>

              {/* Popular criteria */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontWeight: '700', marginBottom: '8px', display: 'block' }}>Tiêu chí phổ biến</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input 
                    type="checkbox" 
                    checked={isDiscountOnly}
                    onChange={(e) => setIsDiscountOnly(e.target.checked)}
                  />
                  <span>Giảm giá</span>
                </label>
              </div>

              {/* Departure time */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontWeight: '700', marginBottom: '8px', display: 'block' }}>Giờ đi</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <input 
                    type="range" 
                    min="0" 
                    max="24" 
                    value={startHour} 
                    onChange={(e) => setStartHour(Math.min(Number(e.target.value), endHour))}
                    style={{ width: '100%', accentColor: 'var(--primary)' }}
                  />
                  <input 
                    type="range" 
                    min="0" 
                    max="24" 
                    value={endHour} 
                    onChange={(e) => setEndHour(Math.max(Number(e.target.value), startHour))}
                    style={{ width: '100%', accentColor: 'var(--primary)' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    <span>{startHour.toString().padStart(2, '0')}:00</span>
                    <span>{endHour === 24 ? '23:59' : `${endHour.toString().padStart(2, '0')}:00`}</span>
                  </div>
                </div>
              </div>

              {/* Price */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontWeight: '700', marginBottom: '8px', display: 'block' }}>Giá vé</label>
                <input 
                  type="range" 
                  min="100000" 
                  max="2000000" 
                  step="50000"
                  value={maxPrice} 
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--primary)' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  <span>0 đ</span>
                  <span>{formatCurrency(maxPrice)}</span>
                </div>
              </div>

              {/* Available seats */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontWeight: '700', marginBottom: '8px', display: 'block' }}>Số chỗ trống</label>
                <input 
                  type="range" 
                  min="0" 
                  max="50" 
                  value={minSeats} 
                  onChange={(e) => setMinSeats(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--primary)' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  <span>0</span>
                  <span>50</span>
                </div>
                {minSeats > 0 && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: '600', marginTop: '4px' }}>
                    Yêu cầu tối thiểu {minSeats} chỗ trống
                  </div>
                )}
              </div>

              {/* Pickup points */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontWeight: '700', marginBottom: '8px', display: 'block' }}>Điểm đón</label>
                <div style={{ position: 'relative', marginBottom: '8px' }}>
                  <input 
                    type="text" 
                    placeholder="Nhập điểm đón" 
                    className="form-control"
                    value={pickupSearch}
                    onChange={(e) => setPickupSearch(e.target.value)}
                    style={{ paddingRight: '35px', fontSize: '0.85rem', height: '36px' }}
                  />
                  <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>🔍</span>
                </div>
                <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px' }}>
                  {filteredPickupLocationsList.length === 0 ? (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Không tìm thấy điểm đón nào</span>
                  ) : (
                    filteredPickupLocationsList.map((loc) => {
                      const isChecked = selectedPickups.includes(loc);
                      return (
                        <label key={loc} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
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
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Dropoff points */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontWeight: '700', marginBottom: '8px', display: 'block' }}>Điểm trả</label>
                <div style={{ position: 'relative', marginBottom: '8px' }}>
                  <input 
                    type="text" 
                    placeholder="Nhập điểm trả" 
                    className="form-control"
                    value={dropoffSearch}
                    onChange={(e) => setDropoffSearch(e.target.value)}
                    style={{ paddingRight: '35px', fontSize: '0.85rem', height: '36px' }}
                  />
                  <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>🔍</span>
                </div>
                <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px' }}>
                  {filteredDropoffLocationsList.length === 0 ? (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Không tìm thấy điểm trả nào</span>
                  ) : (
                    filteredDropoffLocationsList.map((loc) => {
                      const isChecked = selectedDropoffs.includes(loc);
                      return (
                        <label key={loc} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
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
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Bus Type */}
              <div className="form-group" style={{ marginBottom: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <label className="form-label" style={{ fontWeight: '700' }}>Loại xe</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input 
                      type="radio" 
                      name="busType" 
                      checked={busTypeFilter === 'all'} 
                      onChange={() => setBusTypeFilter('all')} 
                    />
                    Tất cả các loại xe
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input 
                      type="radio" 
                      name="busType" 
                      checked={busTypeFilter === 'limousine'} 
                      onChange={() => setBusTypeFilter('limousine')} 
                    />
                    Xe Limousine (9, 19, 22 VIP...)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input 
                      type="radio" 
                      name="busType" 
                      checked={busTypeFilter === 'sleeper'} 
                      onChange={() => setBusTypeFilter('sleeper')} 
                    />
                    Xe Giường Nằm (34, 40, 44 chỗ...)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input 
                      type="radio" 
                      name="busType" 
                      checked={busTypeFilter === 'seater'} 
                      onChange={() => setBusTypeFilter('seater')} 
                    />
                    Xe Ghế Ngồi (16, 29, 45 chỗ...)
                  </label>
                </div>
              </div>

              {/* Sort By */}
              <div className="form-group" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <label className="form-label" style={{ fontWeight: '700' }}>Sắp xếp theo</label>
                <select className="form-control" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="time-asc">Giờ xuất phát (Sớm → Muộn)</option>
                  <option value="price-asc">Giá vé (Thấp → Cao)</option>
                  <option value="price-desc">Giá vé (Cao → Thấp)</option>
                  <option value="rating-desc">Đánh giá sao (Cao → Thấp)</option>
                </select>
              </div>
            </div>

            {/* Right side: Trips List or Empty State */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flexGrow: 1 }}>
              {expandedTripId ? (
                renderSeatSelectionView()
              ) : filteredTrips.length === 0 ? (
                <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
                  <AlertCircle size={48} style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
                  <h3>Không có chuyến xe nào khớp với bộ lọc</h3>
                  <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    Không tìm thấy kết quả phù hợp. Bạn vui lòng thay đổi hoặc xóa các tiêu chí lọc ở cột bên trái để hiển thị lại chuyến đi.
                  </p>
                  <button className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={handleClearFilters}>
                    Xóa tất cả bộ lọc
                  </button>
                </div>
              ) : (
                filteredTrips.map((trip) => {
                const isExpanded = expandedTripId === trip._id;
                const remainingSeatsCount = trip.busId.totalSeats - trip.bookedSeats.length;
                const departureDate = new Date(trip.departureTime);
                const arrivalDate = new Date(trip.arrivalTime);

                // Helper to format hours
                const formatTime = (dateObj) => {
                  return dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
                };

                return (
                  <div key={trip._id} className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                    
                    {/* Upper Trip Summary Card */}
                    <div className="trip-card-inner-layout" style={{ padding: '1.75rem' }}>
                      {/* Left: Bus Image */}
                      <div>
                        <img 
                          src={trip.busId.images[0] || 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=400&q=80'} 
                          alt={trip.busId.type}
                          style={{ width: '100%', height: '90px', objectFit: 'cover', borderRadius: '8px' }}
                        />
                      </div>

                      {/* Center: Route, Time and Amenities */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                          <span style={{ fontWeight: '700', fontSize: '1.15rem', color: 'var(--primary)' }}>{trip.busId.type}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: '#eab308' }}>
                            <Star size={16} fill="#eab308" />
                            <span style={{ fontWeight: '600' }}>{trip.ratings.average}</span>
                            <span style={{ color: 'var(--text-muted)' }}>({trip.ratings.count})</span>
                          </div>
                        </div>

                        {/* Journey Time Details */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', margin: '12px 0' }}>
                          <div>
                            <span style={{ fontSize: '1.25rem', fontWeight: '700' }}>{formatTime(departureDate)}</span>
                            <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{trip.pickupPoints[0]?.location || 'Điểm đi'}</span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexGrow: 0.5, position: 'relative' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                              {trip.routeId.duration}
                            </span>
                            {/* Horizontal Line connector */}
                            <div style={{ height: '2px', backgroundColor: 'var(--border-color)', width: '100%', position: 'relative' }}>
                              <div style={{ 
                                width: '6px', 
                                height: '6px', 
                                borderRadius: '50%', 
                                backgroundColor: 'var(--primary)', 
                                position: 'absolute', 
                                left: '0', 
                                top: '-2px' 
                              }}></div>
                              <div style={{ 
                                width: '6px', 
                                height: '6px', 
                                borderRadius: '50%', 
                                backgroundColor: 'var(--accent)', 
                                position: 'absolute', 
                                right: '0', 
                                top: '-2px' 
                              }}></div>
                            </div>
                          </div>

                          <div>
                            <span style={{ fontSize: '1.25rem', fontWeight: '700' }}>{formatTime(arrivalDate)}</span>
                            <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{trip.dropoffPoints[trip.dropoffPoints.length - 1]?.location || 'Điểm trả'}</span>
                          </div>
                        </div>

                        {/* Amenities Icons */}
                        <div style={{ display: 'flex', gap: '12px', color: 'var(--text-muted)' }}>
                          {trip.busId.amenities.includes('Tivi LED') && <Tv size={16} title="Tivi LED" />}
                          {trip.busId.amenities.includes('Wifi') && <Wifi size={16} title="Wifi miễn phí" />}
                          {trip.busId.amenities.includes('Toilet') && <Coffee size={16} title="Nhà vệ sinh" />}
                          {trip.busId.amenities.includes('Điều hòa') && <Wind size={16} title="Điều hòa" />}
                          {trip.busId.amenities.includes('Nước uống') && <Utensils size={16} title="Nước uống & Khăn lạnh" />}
                        </div>

                        {/* Toggle Details Link */}
                        <div style={{ marginTop: '12px' }}>
                          <button
                            onClick={() => toggleDetails(trip._id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--primary)',
                              fontSize: '0.9rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              padding: '0',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'color 0.2s'
                            }}
                          >
                            <span>{activeDetailsTripId === trip._id ? 'Thông tin chi tiết' : 'Thông tin chi tiết'}</span>
                            {activeDetailsTripId === trip._id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </div>
                      </div>

                      {/* Right: Price & CTA */}
                      <div style={{ textAlign: 'right', borderLeft: '1px solid var(--border-color)', paddingLeft: '1.5rem' }}>
                        <div style={{ fontSize: '1.35rem', fontWeight: '800', color: 'var(--accent)' }}>
                          {formatCurrency(trip.price)}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 12px 0' }}>
                          Còn {remainingSeatsCount} chỗ trống
                        </div>
                        <button 
                          className={`btn ${isExpanded ? 'btn-secondary' : 'btn-primary'}`} 
                          style={{ width: '100%', padding: '10px' }}
                          onClick={() => toggleSelectSeats(trip)}
                        >
                          {isExpanded ? 'Đóng sơ đồ' : 'Chọn chỗ'}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Details Drawer */}
                    {activeDetailsTripId === trip._id && (
                      <div style={{ borderTop: '1px solid var(--border-color)', backgroundColor: '#fafafa', padding: '1.5rem 1.75rem' }}>
                        {/* Tab Bar headers */}
                        <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.25rem', overflowX: 'auto' }}>
                          {[
                            { id: 'images', name: 'Hình ảnh' },
                            { id: 'amenities', name: 'Tiện ích' },
                            { id: 'pickup-dropoff', name: 'Điểm đón, trả' },
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

                              // Tab 1: Hình ảnh
                              if (activeDetailTab === 'images') {
                                const busImages = currentTrip.busId.images && currentTrip.busId.images.length > 0 
                                  ? currentTrip.busId.images 
                                  : [
                                      'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80',
                                      'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=600&q=80',
                                      'https://images.unsplash.com/photo-1561361513-2d000a50f0db?auto=format&fit=crop&w=600&q=80'
                                    ];
                                return (
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }} className="animate-fade-in">
                                    {busImages.map((img, idx) => (
                                      <img 
                                        key={idx} 
                                        src={img} 
                                        alt={`Bus view ${idx + 1}`} 
                                        style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                                      />
                                    ))}
                                  </div>
                                );
                              }

                              // Tab 2: Tiện ích
                              if (activeDetailTab === 'amenities') {
                                const amenitiesData = [
                                  { name: 'Wifi', icon: <Wifi size={20} />, desc: 'Sóng wifi tốc độ cao kết nối ổn định suốt hành trình.' },
                                  { name: 'Tivi LED', icon: <Tv size={20} />, desc: 'Màn hình LED giải trí cá nhân cài sẵn kho phim, ca nhạc phong phú.' },
                                  { name: 'Toilet', icon: <Coffee size={20} />, desc: 'Buồng vệ sinh khép kín sạch sẽ, tiện lợi bố trí cuối xe.' },
                                  { name: 'Điều hòa', icon: <Wind size={20} />, desc: 'Hệ thống máy lạnh lọc gió kháng khuẩn phân bổ đều các cabin.' },
                                  { name: 'Nước uống', icon: <Utensils size={20} />, desc: 'Miễn phí nước uống đóng chai Aquafina cùng khăn lạnh cao cấp.' }
                                ];

                                return (
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }} className="animate-fade-in">
                                    {amenitiesData.map((item, idx) => {
                                      const hasAmenity = currentTrip.busId.amenities.some(a => a.toLowerCase().includes(item.name.toLowerCase()));
                                      return (
                                        <div key={idx} style={{ 
                                          display: 'flex', 
                                          gap: '15px', 
                                          opacity: hasAmenity ? 1 : 0.4,
                                          border: '1px solid var(--border-color)',
                                          borderRadius: '8px',
                                          padding: '12px',
                                          backgroundColor: '#ffffff'
                                        }}>
                                          <div style={{ color: hasAmenity ? 'var(--primary)' : 'var(--text-muted)' }}>
                                            {item.icon}
                                          </div>
                                          <div>
                                            <h5 style={{ fontWeight: '700', marginBottom: '4px', textDecoration: hasAmenity ? 'none' : 'line-through' }}>{item.name}</h5>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.desc}</p>
                                          </div>
                                        </div>
                                      );
                                    })}
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
            </div>

          </div>
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
