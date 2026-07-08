const Trip = require('../models/Trip');
const Route = require('../models/Route');
const Bus = require('../models/Bus');
const Review = require('../models/Review');

// @desc    Search trips by origin, destination and date
// @route   GET /api/v1/trips/search
// @access  Public
exports.searchTrips = async (req, res) => {
  try {
    const { from, to, date } = req.query;

    if (!from || !to || !date) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp Điểm đi (from), Điểm đến (to) và Ngày đi (date).'
      });
    }

    // 1. Find the Route
    const route = await Route.findOne({
      startPoint: { $regex: new RegExp(`^${from.trim()}$`, 'i') },
      endPoint: { $regex: new RegExp(`^${to.trim()}$`, 'i') }
    });

    if (!route) {
      return res.status(200).json({
        success: true,
        trips: [],
        message: 'Không tìm thấy chuyến xe nào chạy tuyến đường này.'
      });
    }

    // 2. Query Trips by route and date range (00:00:00 to 23:59:59)
    const searchDate = new Date(date);
    const startOfDay = new Date(searchDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(searchDate.setHours(23, 59, 59, 999));

    const trips = await Trip.find({
      routeId: route._id,
      departureTime: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    })
      .populate('routeId')
      .populate('busId')
      .sort({ departureTime: 1 });

    res.status(200).json({
      success: true,
      count: trips.length,
      trips
    });
  } catch (error) {
    console.error('Lỗi tìm kiếm chuyến đi:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi tìm kiếm chuyến đi.',
      error: error.message
    });
  }
};

// @desc    Get detailed trip by ID (with seat map info)
// @route   GET /api/v1/trips/:id
// @access  Public
exports.getTripById = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id)
      .populate('routeId')
      .populate('busId');

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy chuyến đi này.'
      });
    }

    const reviews = await Review.find({ tripId: trip._id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      trip,
      reviews
    });
  } catch (error) {
    console.error('Lỗi lấy thông tin chi tiết chuyến đi:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi lấy chi tiết chuyến đi.',
      error: error.message
    });
  }
};
