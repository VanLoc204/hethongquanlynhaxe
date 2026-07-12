const PricingRule = require('../models/PricingRule');

// @desc    Get all pricing rules
// @route   GET /api/v1/pricing/rules
// @access  Private (General Manager / Admin / Ticket Agent)
exports.getRules = async (req, res) => {
  try {
    const rules = await PricingRule.find({});
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

    const rule = await PricingRule.create({
      name,
      routeId,
      routeName,
      busType,
      dayOfWeek,
      adjustmentType,
      adjustmentValue,
      isActive
    });

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

    let rule = await PricingRule.findById(id);
    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy quy định giá.'
      });
    }

    if (name) rule.name = name;
    if (routeId) rule.routeId = routeId;
    if (routeName) rule.routeName = routeName;
    if (busType) rule.busType = busType;
    if (dayOfWeek) rule.dayOfWeek = dayOfWeek;
    if (adjustmentType) rule.adjustmentType = adjustmentType;
    if (adjustmentValue !== undefined) rule.adjustmentValue = adjustmentValue;
    if (isActive !== undefined) rule.isActive = isActive;

    await rule.save();

    res.status(200).json({
      success: true,
      message: 'Cập nhật quy định giá thành công.',
      rule
    });
  } catch (error) {
    console.error('Lỗi cập nhật quy định giá:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi cập nhật quy định giá.',
      error: error.message
    });
  }
};

// @desc    Delete a pricing rule
// @route   DELETE /api/v1/pricing/rules/:id
// @access  Private (General Manager / Admin)
exports.deleteRule = async (req, res) => {
  try {
    const { id } = req.params;

    const rule = await PricingRule.findById(id);
    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy quy định giá.'
      });
    }

    await rule.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Xóa quy định giá thành công.'
    });
  } catch (error) {
    console.error('Lỗi xóa quy định giá:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi xóa quy định giá.',
      error: error.message
    });
  }
};
