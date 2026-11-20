const Promotion = require('../models/Promotion');

// @desc    Get all promotions with statistics
// @route   GET /api/promotions
exports.getPromotions = async (req, res, next) => {
  try {
    const { search, status, discountType } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { code: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } }
      ];
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (discountType && discountType !== 'all') {
      query.discountType = discountType;
    }

    const promotions = await Promotion.find(query).sort({ createdAt: -1 });

    // Calculate aggregated stats
    const allPromos = await Promotion.find({});
    const totalPromotions = allPromos.length;
    const activePromotions = allPromos.filter(p => p.status === 'active').length;
    const totalUsages = allPromos.reduce((sum, p) => sum + (p.usedCount || 0), 0);
    
    // Estimate total discount savings (or total revenue stimulated)
    const estimatedSavings = allPromos.reduce((sum, p) => {
      const avgVal = p.discountType === 'percentage' ? 45000 : (p.discountValue || 0);
      return sum + (p.usedCount || 0) * avgVal;
    }, 0);

    res.status(200).json({
      success: true,
      stats: {
        totalPromotions,
        activePromotions,
        totalUsages,
        estimatedSavings,
      },
      data: promotions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new promotion
// @route   POST /api/promotions
exports.createPromotion = async (req, res, next) => {
  try {
    const {
      code,
      title,
      description,
      discountType,
      discountValue,
      maxDiscountAmount,
      minOrderValue,
      usageLimit,
      startDate,
      endDate,
      status,
    } = req.body;

    // Check duplicate code
    const existing = await Promotion.findOne({ code: code.toUpperCase().trim() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Mã khuyến mãi "${code.toUpperCase()}" đã tồn tại trên hệ thống.`,
      });
    }

    const promotion = await Promotion.create({
      code: code.toUpperCase().trim(),
      title,
      description,
      discountType: discountType || 'fixed_amount',
      discountValue: Number(discountValue) || 0,
      maxDiscountAmount: Number(maxDiscountAmount) || 0,
      minOrderValue: Number(minOrderValue) || 0,
      usageLimit: Number(usageLimit) || 100,
      usedCount: 0,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: status || 'active',
      createdBy: req.user ? `${req.user.name || req.user.email}` : 'Ban Giám Đốc',
    });

    res.status(201).json({
      success: true,
      message: 'Tạo mã khuyến mãi thành công!',
      data: promotion,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update promotion
// @route   PUT /api/promotions/:id
exports.updatePromotion = async (req, res, next) => {
  try {
    const { id } = req.params;
    let promo = await Promotion.findById(id);

    if (!promo) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy mã khuyến mãi.',
      });
    }

    const updateData = { ...req.body };
    if (updateData.code) {
      updateData.code = updateData.code.toUpperCase().trim();
    }
    if (updateData.discountValue) updateData.discountValue = Number(updateData.discountValue);
    if (updateData.maxDiscountAmount !== undefined) updateData.maxDiscountAmount = Number(updateData.maxDiscountAmount);
    if (updateData.minOrderValue !== undefined) updateData.minOrderValue = Number(updateData.minOrderValue);
    if (updateData.usageLimit !== undefined) updateData.usageLimit = Number(updateData.usageLimit);

    promo = await Promotion.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'Cập nhật mã khuyến mãi thành công!',
      data: promo,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle status (active <-> inactive)
// @route   PATCH /api/promotions/:id/toggle-status
exports.togglePromotionStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const promo = await Promotion.findById(id);

    if (!promo) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy mã khuyến mãi.',
      });
    }

    promo.status = promo.status === 'active' ? 'inactive' : 'active';
    await promo.save();

    res.status(200).json({
      success: true,
      message: `Đã ${promo.status === 'active' ? 'kích hoạt' : 'tạm dừng'} mã ${promo.code}`,
      data: promo,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete promotion
// @route   DELETE /api/promotions/:id
exports.deletePromotion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const promo = await Promotion.findByIdAndDelete(id);

    if (!promo) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy mã khuyến mãi.',
      });
    }

    res.status(200).json({
      success: true,
      message: `Đã xóa mã khuyến mãi ${promo.code}`,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Validate promotion code for checkout
// @route   POST /api/promotions/validate
exports.validatePromotion = async (req, res, next) => {
  try {
    const { code, orderAmount } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập mã khuyến mãi.' });
    }

    const promo = await Promotion.findOne({ code: code.toUpperCase().trim(), status: 'active' });

    if (!promo) {
      return res.status(404).json({
        success: false,
        message: 'Mã khuyến mãi không tồn tại hoặc đã bị hết hạn/tạm dừng.',
      });
    }

    const now = new Date();
    if (now < new Date(promo.startDate) || now > new Date(promo.endDate)) {
      return res.status(400).json({
        success: false,
        message: 'Mã khuyến mãi chưa đến hạn hoặc đã hết thời gian áp dụng.',
      });
    }

    if (promo.usedCount >= promo.usageLimit) {
      return res.status(400).json({
        success: false,
        message: 'Mã khuyến mãi đã hết lượt sử dụng.',
      });
    }

    if (orderAmount && Number(orderAmount) < promo.minOrderValue) {
      return res.status(400).json({
        success: false,
        message: `Đơn hàng tối thiểu ${promo.minOrderValue.toLocaleString('vi-VN')}đ mới được áp dụng mã này.`,
      });
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (promo.discountType === 'percentage') {
      discountAmount = (Number(orderAmount) * promo.discountValue) / 100;
      if (promo.maxDiscountAmount > 0 && discountAmount > promo.maxDiscountAmount) {
        discountAmount = promo.maxDiscountAmount;
      }
    } else {
      discountAmount = promo.discountValue;
    }

    res.status(200).json({
      success: true,
      message: 'Áp dụng mã khuyến mãi thành công!',
      data: {
        code: promo.code,
        title: promo.title,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        discountAmount,
      },
    });
  } catch (error) {
    next(error);
  }
};
