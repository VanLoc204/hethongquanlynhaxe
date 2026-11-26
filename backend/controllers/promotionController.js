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

    // 1. Validate Code
    const cleanCode = (code || '').toUpperCase().trim();
    if (!cleanCode) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập mã voucher.' });
    }
    if (!/^[A-Z0-9_-]{3,20}$/.test(cleanCode)) {
      return res.status(400).json({
        success: false,
        message: 'Mã voucher phải từ 3 đến 20 ký tự, viết liền không dấu, chỉ gồm chữ cái, số, gạch nối (-) hoặc gạch dưới (_).'
      });
    }

    // 2. Validate Title
    const cleanTitle = (title || '').trim();
    if (!cleanTitle || cleanTitle.length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Tên chương trình khuyến mãi phải có ít nhất 5 ký tự.'
      });
    }

    // 3. Validate Discount Type & Value
    const type = discountType === 'percentage' ? 'percentage' : 'fixed_amount';
    const numValue = Number(discountValue);
    if (isNaN(numValue) || numValue <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Mức giảm giá phải là số dương lớn hơn 0.'
      });
    }

    if (type === 'percentage') {
      if (numValue < 1 || numValue > 100) {
        return res.status(400).json({
          success: false,
          message: 'Tỷ lệ giảm giá (%) phải nằm trong khoảng từ 1% đến 100%.'
        });
      }
    } else {
      if (numValue < 1000) {
        return res.status(400).json({
          success: false,
          message: 'Mức giảm tiền cố định tối thiểu là 1.000 VNĐ.'
        });
      }
    }

    // 4. Validate minOrderValue
    const numMinOrder = Number(minOrderValue) || 0;
    if (numMinOrder < 0) {
      return res.status(400).json({
        success: false,
        message: 'Đơn hàng tối thiểu không được là số âm.'
      });
    }

    if (type === 'fixed_amount' && numMinOrder > 0 && numValue > numMinOrder) {
      return res.status(400).json({
        success: false,
        message: `Mức giảm (${numValue.toLocaleString('vi-VN')}đ) không được vượt quá đơn hàng tối thiểu (${numMinOrder.toLocaleString('vi-VN')}đ).`
      });
    }

    // 5. Validate maxDiscountAmount
    const numMaxDiscount = Number(maxDiscountAmount) || 0;
    if (numMaxDiscount < 0) {
      return res.status(400).json({
        success: false,
        message: 'Mức giảm tối đa không được là số âm.'
      });
    }

    // 6. Validate usageLimit
    const numLimit = Number(usageLimit);
    if (isNaN(numLimit) || numLimit < 1 || !Number.isInteger(numLimit)) {
      return res.status(400).json({
        success: false,
        message: 'Giới hạn lượt dùng phải là số nguyên lớn hơn hoặc bằng 1.'
      });
    }

    // 7. Validate Dates
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn ngày bắt đầu và ngày kết thúc khuyến mãi.'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Định dạng ngày bắt đầu hoặc ngày kết thúc không hợp lệ.'
      });
    }

    if (end < start) {
      return res.status(400).json({
        success: false,
        message: 'Ngày kết thúc phải diễn ra sau hoặc cùng ngày với ngày bắt đầu.'
      });
    }

    // 8. Check duplicate code
    const existing = await Promotion.findOne({ code: cleanCode });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Mã khuyến mãi "${cleanCode}" đã tồn tại trên hệ thống.`,
      });
    }

    const promotion = await Promotion.create({
      code: cleanCode,
      title: cleanTitle,
      description: (description || '').trim(),
      discountType: type,
      discountValue: numValue,
      maxDiscountAmount: type === 'percentage' ? numMaxDiscount : 0,
      minOrderValue: numMinOrder,
      usageLimit: numLimit,
      usedCount: 0,
      startDate: start,
      endDate: end,
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

    // Validate Code if changed
    if (updateData.code !== undefined) {
      const cleanCode = (updateData.code || '').toUpperCase().trim();
      if (!cleanCode) {
        return res.status(400).json({ success: false, message: 'Mã voucher không được để trống.' });
      }
      if (!/^[A-Z0-9_-]{3,20}$/.test(cleanCode)) {
        return res.status(400).json({
          success: false,
          message: 'Mã voucher phải từ 3 đến 20 ký tự, viết liền không dấu (A-Z, 0-9, -, _).'
        });
      }
      const duplicate = await Promotion.findOne({ code: cleanCode, _id: { $ne: id } });
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: `Mã khuyến mãi "${cleanCode}" đã tồn tại trên hệ thống.`,
        });
      }
      updateData.code = cleanCode;
    }

    // Validate Title if changed
    if (updateData.title !== undefined) {
      const cleanTitle = (updateData.title || '').trim();
      if (!cleanTitle || cleanTitle.length < 5) {
        return res.status(400).json({
          success: false,
          message: 'Tên chương trình khuyến mãi phải có ít nhất 5 ký tự.'
        });
      }
      updateData.title = cleanTitle;
    }

    const currentType = updateData.discountType || promo.discountType;
    if (updateData.discountValue !== undefined) {
      const numValue = Number(updateData.discountValue);
      if (isNaN(numValue) || numValue <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Mức giảm giá phải là số dương lớn hơn 0.'
        });
      }
      if (currentType === 'percentage' && (numValue < 1 || numValue > 100)) {
        return res.status(400).json({
          success: false,
          message: 'Tỷ lệ giảm giá (%) phải nằm trong khoảng từ 1% đến 100%.'
        });
      }
      if (currentType === 'fixed_amount' && numValue < 1000) {
        return res.status(400).json({
          success: false,
          message: 'Mức giảm tiền cố định tối thiểu là 1.000 VNĐ.'
        });
      }
      updateData.discountValue = numValue;
    }

    if (updateData.minOrderValue !== undefined) {
      const numMinOrder = Number(updateData.minOrderValue) || 0;
      if (numMinOrder < 0) {
        return res.status(400).json({ success: false, message: 'Đơn hàng tối thiểu không được là số âm.' });
      }
      updateData.minOrderValue = numMinOrder;
    }

    if (currentType === 'fixed_amount') {
      const minOrder = updateData.minOrderValue !== undefined ? updateData.minOrderValue : promo.minOrderValue;
      const discountVal = updateData.discountValue !== undefined ? updateData.discountValue : promo.discountValue;
      if (minOrder > 0 && discountVal > minOrder) {
        return res.status(400).json({
          success: false,
          message: `Mức giảm (${discountVal.toLocaleString('vi-VN')}đ) không được vượt quá đơn hàng tối thiểu (${minOrder.toLocaleString('vi-VN')}đ).`
        });
      }
    }

    if (updateData.maxDiscountAmount !== undefined) {
      const numMax = Number(updateData.maxDiscountAmount) || 0;
      if (numMax < 0) {
        return res.status(400).json({ success: false, message: 'Mức giảm tối đa không được là số âm.' });
      }
      updateData.maxDiscountAmount = currentType === 'percentage' ? numMax : 0;
    }

    if (updateData.usageLimit !== undefined) {
      const numLimit = Number(updateData.usageLimit);
      if (isNaN(numLimit) || numLimit < 1 || !Number.isInteger(numLimit)) {
        return res.status(400).json({ success: false, message: 'Giới hạn lượt dùng phải là số nguyên >= 1.' });
      }
      if (numLimit < promo.usedCount) {
        return res.status(400).json({
          success: false,
          message: `Giới hạn lượt dùng mới (${numLimit}) không được nhỏ hơn số lượt đã dùng hiện tại (${promo.usedCount}).`
        });
      }
      updateData.usageLimit = numLimit;
    }

    if (updateData.startDate || updateData.endDate) {
      const start = new Date(updateData.startDate || promo.startDate);
      const end = new Date(updateData.endDate || promo.endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ success: false, message: 'Định dạng ngày không hợp lệ.' });
      }
      if (end < start) {
        return res.status(400).json({ success: false, message: 'Ngày kết thúc phải diễn ra sau hoặc cùng ngày với ngày bắt đầu.' });
      }
      if (updateData.startDate) updateData.startDate = start;
      if (updateData.endDate) updateData.endDate = end;
    }

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
