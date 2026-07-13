const pricingService = require('../services/pricingService');

// @desc    Get all pricing rules
// @route   GET /api/v1/pricing/rules
// @access  Private (General Manager / Admin / Ticket Agent)
exports.getRules = async (req, res) => {
  try {
    const rules = await pricingService.getRules();
    res.status(200).json({
      success: true,
      count: rules.length,
      rules
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách quy định giá:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi lấy danh sách quy định giá.',
      error: error.message
    });
  }
};

// @desc    Create a pricing rule
// @route   POST /api/v1/pricing/rules
// @access  Private (General Manager / Admin)
exports.createRule = async (req, res) => {
  try {
    const { name, routeId, routeName, busType, dayOfWeek, adjustmentType, adjustmentValue, isActive } = req.body;
    const rule = await pricingService.createRule({ name, routeId, routeName, busType, dayOfWeek, adjustmentType, adjustmentValue, isActive });

    res.status(201).json({
      success: true,
      message: 'Tạo quy định giá mới thành công.',
      rule
    });
  } catch (error) {
    console.error('Lỗi tạo quy định giá:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi tạo quy định giá.',
      error: error.message
    });
  }
};

// @desc    Update a pricing rule
// @route   PUT /api/v1/pricing/rules/:id
// @access  Private (General Manager / Admin)
exports.updateRule = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, routeId, routeName, busType, dayOfWeek, adjustmentType, adjustmentValue, isActive } = req.body;

    const rule = await pricingService.updateRule(id, { name, routeId, routeName, busType, dayOfWeek, adjustmentType, adjustmentValue, isActive });

    res.status(200).json({
      success: true,
      message: 'Cập nhật quy định giá thành công.',
      rule
    });
  } catch (error) {
    console.error('Lỗi cập nhật quy định giá:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi cập nhật quy định giá.'
    });
  }
};

// @desc    Delete a pricing rule
// @route   DELETE /api/v1/pricing/rules/:id
// @access  Private (General Manager / Admin)
exports.deleteRule = async (req, res) => {
  try {
    const { id } = req.params;
    await pricingService.deleteRule(id);

    res.status(200).json({
      success: true,
      message: 'Xóa quy định giá thành công.'
    });
  } catch (error) {
    console.error('Lỗi xóa quy định giá:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi xóa quy định giá.'
    });
  }
};

// @desc    Get all base prices combinations (Route + Bus Type)
// @route   GET /api/v1/pricing/base-prices
// @access  Private (General Manager / Admin / Ops Manager / Ticket Agent)
exports.getBasePrices = async (req, res) => {
  try {
    const combinations = await pricingService.getBasePricesCombinations();
    res.status(200).json({
      success: true,
      count: combinations.length,
      basePrices: combinations
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách giá vé cơ bản:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi lấy danh sách giá vé cơ bản.',
      error: error.message
    });
  }
};

// @desc    Create or update base price for Route + Bus Type
// @route   POST /api/v1/pricing/base-prices
// @access  Private (General Manager / Admin)
exports.setBasePrice = async (req, res) => {
  try {
    const { routeId, routeName, busType, price } = req.body;

    if (!routeId || !routeName || !busType || price === undefined || price === null) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ thông tin: routeId, routeName, busType và price.'
      });
    }

    const basePrice = await pricingService.setBasePrice({ routeId, routeName, busType, price });

    res.status(200).json({
      success: true,
      message: 'Thiết lập giá vé cơ bản thành công.',
      basePrice
    });
  } catch (error) {
    console.error('Lỗi thiết lập giá vé cơ bản:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi thiết lập giá vé cơ bản.',
      error: error.message
    });
  }
};

// @desc    Lookup base price for Route + Bus
// @route   GET /api/v1/pricing/base-prices/lookup
// @access  Private (Ops Manager / Admin / General Manager)
exports.lookupPrice = async (req, res) => {
  try {
    const { routeId, busId } = req.query;

    if (!routeId || !busId) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp routeId và busId.'
      });
    }

    const price = await pricingService.lookupPrice({ routeId, busId });

    if (price === null) {
      return res.status(200).json({
        success: true,
        price: null,
        message: 'Chưa thiết lập giá vé cơ bản cho tuyến đường và loại xe này.'
      });
    }

    res.status(200).json({
      success: true,
      price
    });
  } catch (error) {
    console.error('Lỗi tra cứu giá vé cơ bản:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi tra cứu giá vé.'
    });
  }
};
