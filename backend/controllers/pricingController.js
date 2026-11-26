const pricingService = require('../services/pricingService');
const { getExecutiveAiChatResponse } = require('../services/geminiService');

// @desc    Get all pricing rules
// @route   GET /api/pricing/rules
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

// @desc    Executive AI Chat Assistant for General Manager
// @route   POST /api/pricing/gm-ai-chat
// @access  Private (General Manager / Admin)
exports.getExecutiveAiChat = async (req, res) => {
  try {
    const { history, message } = req.body;
    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập nội dung câu hỏi cho AI.'
      });
    }

    const reply = await getExecutiveAiChatResponse(history || [], message);

    res.status(200).json({
      success: true,
      reply,
    });
  } catch (error) {
    console.error('Lỗi Executive AI Chat:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xử lý phản hồi từ AI Gemini.',
      error: error.message,
    });
  }
};

// @desc    Get demand analytics & AI strategic action recommendations
// @route   GET /api/pricing/demand-analytics
// @access  Private (General Manager / Admin)
exports.getDemandAnalytics = async (req, res) => {
  try {
    const { search, status, routeId } = req.query;
    const result = await pricingService.getDemandAnalytics({ search, status, routeId });

    res.status(200).json({
      success: true,
      data: result.analytics,
      aiStrategicActions: result.aiStrategicActions,
    });
  } catch (error) {
    console.error('Lỗi lấy phân tích nhu cầu:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi phân tích nhu cầu.',
      error: error.message,
    });
  }
};

// @desc    Lấy thống kê nhu cầu tìm kiếm chưa được đáp ứng (AI Unmet Demand Sensing)
// @route   GET /api/pricing/unmet-demand
// @access  Private (General Manager / Admin)
exports.getUnmetDemandAnalytics = async (req, res) => {
  try {
    const RouteDemandLog = require('../models/RouteDemandLog');
    const { generateUnmetDemandAiAnalysis } = require('../services/geminiService');

    // Lấy toàn bộ các bản ghi tìm kiếm chưa có kết quả (hasResults = false)
    // Loại trừ các bản ghi mà hệ thống đã ghi nhận là tuyến đã có (isRouteExistingInSystem = true)
    const rawLogs = await RouteDemandLog.find({
      hasResults: false,
      isRouteExistingInSystem: { $ne: true }
    }).lean();

    // Gom cụm thông minh theo nhãn Vùng do Gemini AI chuẩn hóa (Zero-Hardcode)
    const fullRouteMap = new Map();
    const singleDestMap = new Map();

    for (const log of rawLogs) {
      // Phân tách nhu cầu 2 chiều và nhu cầu 1 chiều
      const isSingleDest = log.demandType === 'destination_only' || (!log.fromRaw && log.toRaw);

      if (isSingleDest) {
        const destKey = log.toNormalized || log.toRaw || 'Điểm đến chưa rõ';
        if (!singleDestMap.has(destKey)) {
          singleDestMap.set(destKey, {
            destination: destKey,
            province: log.toProvince || '',
            searchCount: 0,
            totalPassengers: 0,
            lastSearched: log.createdAt || new Date()
          });
        }
        const entry = singleDestMap.get(destKey);
        entry.searchCount += 1;
        entry.totalPassengers += (log.passengers || 1);
        if (log.createdAt && new Date(log.createdAt) > new Date(entry.lastSearched)) {
          entry.lastSearched = log.createdAt;
        }
      } else {
        // Cặp chặng 2 chiều: Dùng regionCluster do Gemini chuẩn hóa
        const clusterName = log.regionCluster || `${log.fromNormalized || log.fromRaw} ➔ ${log.toNormalized || log.toRaw}`;
        const fromNorm = log.fromNormalized || log.fromRaw || 'Toàn quốc';
        const toNorm = log.toNormalized || log.toRaw || 'Toàn quốc';

        if (!fullRouteMap.has(clusterName)) {
          fullRouteMap.set(clusterName, {
            from: fromNorm,
            to: toNorm,
            routeName: clusterName,
            searchCount: 0,
            totalPassengers: 0,
            lastSearched: log.createdAt || new Date(),
            isExistingRoute: false
          });
        }

        const entry = fullRouteMap.get(clusterName);
        entry.searchCount += 1;
        entry.totalPassengers += (log.passengers || 1);
        if (log.createdAt && new Date(log.createdAt) > new Date(entry.lastSearched)) {
          entry.lastSearched = log.createdAt;
        }
      }
    }

    const baseRoutes = Array.from(fullRouteMap.values())
      .sort((a, b) => b.searchCount - a.searchCount)
      .slice(0, 15);

    const singleDestinations = Array.from(singleDestMap.values())
      .sort((a, b) => b.searchCount - a.searchCount)
      .slice(0, 10);

    if (baseRoutes.length === 0 && singleDestinations.length === 0) {
      return res.status(200).json({
        success: true,
        kpis: {
          totalUnmetSearches: 0,
          topDemandRoute: 'Chưa có',
          topRouteSearches: 0,
          urgentRoutesCount: 0,
          potentialRoutesCount: 0,
          totalTrackedRoutes: 0,
          singleDestinations: []
        },
        data: [],
        singleDestinations: []
      });
    }

    // Gọi Gemini AI phân tích thông minh các tuyến và tự động đưa ra đề xuất hành động thực tiễn
    const aiEvaluations = await generateUnmetDemandAiAnalysis(baseRoutes);
    const aiMap = new Map((aiEvaluations || []).map(e => [`${e.from}_${e.to}`, e]));

    const analyzedRoutes = baseRoutes.map(item => {
      const aiEval = aiMap.get(`${item.from}_${item.to}`) || {};
      const urgencyLevel = aiEval.urgencyLevel || (item.searchCount >= 100 ? 'URGENT' : item.searchCount >= 30 ? 'POTENTIAL' : 'MONITORING');
      const urgencyBadge = aiEval.urgencyBadge || (item.searchCount >= 100 ? 'Nhu cầu Rất Cao' : item.searchCount >= 30 ? 'Tiềm năng' : 'Mới phát hiện');
      const urgencyColor = aiEval.urgencyColor || (item.searchCount >= 100 ? '#dc2626' : item.searchCount >= 30 ? '#d97706' : '#64748b');
      const aiSuggestions = aiEval.aiSuggestions && aiEval.aiSuggestions.length > 0
        ? aiEval.aiSuggestions
        : [
            `• Nhu cầu ghi nhận ${item.searchCount} lượt tìm kiếm.`,
            `• Tiếp tục lưu vết theo dõi xu hướng thị trường.`
          ];

      return {
        from: item.from,
        to: item.to,
        routeName: item.routeName,
        searchCount: item.searchCount,
        totalPassengers: item.totalPassengers,
        urgencyLevel,
        urgencyBadge,
        urgencyColor,
        aiSuggestions,
        aiActionText: aiSuggestions.join(' '),
        isExistingRoute: item.isExistingRoute,
        lastSearched: item.lastSearched
      };
    });

    const totalUnmetSearches = analyzedRoutes.reduce((sum, r) => sum + r.searchCount, 0);
    const topRoute = analyzedRoutes.length > 0 ? analyzedRoutes[0].routeName : 'Chưa có';
    const topRouteSearches = analyzedRoutes.length > 0 ? analyzedRoutes[0].searchCount : 0;
    const urgentRoutesCount = analyzedRoutes.filter(r => r.urgencyLevel === 'URGENT').length;
    const potentialRoutesCount = analyzedRoutes.filter(r => r.urgencyLevel === 'POTENTIAL').length;

    res.status(200).json({
      success: true,
      kpis: {
        totalUnmetSearches,
        topDemandRoute: topRoute,
        topRouteSearches,
        urgentRoutesCount,
        potentialRoutesCount,
        totalTrackedRoutes: analyzedRoutes.length,
        singleDestinations
      },
      data: analyzedRoutes,
      singleDestinations
    });
  } catch (error) {
    console.error('Lỗi lấy phân tích nhu cầu chưa đáp ứng:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi phân tích nhu cầu mở tuyến mới.',
      error: error.message
    });
  }
};

// @desc    Create a pricing rule
// @route   POST /api/pricing/rules
// @access  Private (General Manager / Admin)
exports.createRule = async (req, res) => {
  try {
    const { name, routeId, routeName, busType, dayOfWeek, adjustmentType, adjustmentValue, startDate, endDate, isActive } = req.body;
    const rule = await pricingService.createRule({ name, routeId, routeName, busType, dayOfWeek, adjustmentType, adjustmentValue, startDate, endDate, isActive });

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
// @route   PUT /api/pricing/rules/:id
// @access  Private (General Manager / Admin)
exports.updateRule = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, routeId, routeName, busType, dayOfWeek, adjustmentType, adjustmentValue, startDate, endDate, isActive } = req.body;

    const rule = await pricingService.updateRule(id, { name, routeId, routeName, busType, dayOfWeek, adjustmentType, adjustmentValue, startDate, endDate, isActive });

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
// @route   DELETE /api/pricing/rules/:id
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

// @desc    Get AI dynamic pricing suggestions (ONLY for active routes and trips operating)
// @route   GET /api/pricing/dynamic-suggestions
// @access  Private (General Manager / Admin)
exports.getDynamicSuggestions = async (req, res) => {
  try {
    const suggestions = await pricingService.getDynamicPricingSuggestions();
    res.status(200).json({
      success: true,
      count: suggestions.length,
      suggestions
    });
  } catch (error) {
    console.error('Lỗi lấy gợi ý điều chỉnh giá vé AI:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi phân tích gợi ý giá vé AI.',
      error: error.message
    });
  }
};

// @desc    Get all base prices combinations (Route + Bus Type)
// @route   GET /api/pricing/base-prices
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
// @route   POST /api/pricing/base-prices
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
// @route   GET /api/pricing/base-prices/lookup
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

const PricingProposal = require('../models/PricingProposal');
const Route = require('../models/Route');
const Notification = require('../models/Notification');

// @desc    Create a pricing proposal (Ticket Manager -> General Manager)
// @route   POST /api/pricing/proposals
// @desc    Create a pricing proposal (Ticket Manager -> General Manager)
// @route   POST /api/pricing/proposals
// @access  Private (Ticket Manager, General Manager, Admin)
exports.createPricingProposal = async (req, res) => {
  try {
    const {
      title,
      proposalCategory = 'adjustment', // 'adjustment' | 'base_price'
      routeId,
      busType,
      proposalType,
      adjustmentPercentage,
      currentPrice,
      proposedPrice,
      effectiveFrom,
      effectiveTo,
      reason
    } = req.body;

    if (!title || !routeId || proposedPrice === undefined || proposedPrice === null || !effectiveFrom || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ thông tin đề xuất: Tiêu đề, Tuyến đường, Giá đề xuất, Ngày bắt đầu và Lý do.'
      });
    }

    if (proposalCategory === 'adjustment' && !effectiveTo) {
      return res.status(400).json({
        success: false,
        message: 'Đề xuất điều chỉnh giá vé yêu cầu phải có ngày kết thúc hiệu lực.'
      });
    }

    if (effectiveTo && new Date(effectiveFrom) > new Date(effectiveTo)) {
      return res.status(400).json({
        success: false,
        message: 'Ngày bắt đầu áp dụng phải trước ngày kết thúc.'
      });
    }

    const route = await Route.findById(routeId).select('name startPoint endPoint').lean();
    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin tuyến đường.'
      });
    }

    const proposal = await PricingProposal.create({
      proposerId: req.user.id,
      title: title.trim(),
      proposalCategory,
      routeId,
      busType: busType || 'all',
      proposalType: proposalType || (proposalCategory === 'base_price' ? 'fixed_price' : 'percentage'),
      currentPrice: Number(currentPrice) || 0,
      proposedPrice: Number(proposedPrice),
      effectiveFrom: new Date(effectiveFrom),
      effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
      reason: reason.trim(),
      status: 'pending'
    });

    // Tạo thông báo cho Ban Giám đốc
    try {
      const categoryLabel = proposalCategory === 'base_price' ? 'thay đổi giá vé gốc' : 'điều chỉnh giá vé';
      await Notification.create({
        recipientRole: 'general_manager',
        title: `Đề xuất ${categoryLabel} mới`,
        content: `Quản lý phòng vé ${req.user.name || ''} vừa gửi đề xuất ${categoryLabel}: "${title.trim()}". Tuyến: ${route.name || `${route.startPoint} -> ${route.endPoint}`}.`,
        type: 'general',
        link: '/gm-pricing'
      });
    } catch (notifErr) {
      console.warn('Không thể gửi notification cho GM:', notifErr.message);
    }

    res.status(201).json({
      success: true,
      message: `Gửi đề xuất ${proposalCategory === 'base_price' ? 'thay đổi giá vé gốc' : 'điều chỉnh giá vé'} thành công. Chờ Ban Giám đốc phê duyệt.`,
      proposal
    });
  } catch (error) {
    console.error('Lỗi tạo đề xuất giá vé:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi tạo đề xuất giá vé.',
      error: error.message
    });
  }
};

// @desc    Get all pricing proposals
// @route   GET /api/pricing/proposals
// @access  Private (Ticket Manager, General Manager, Admin)
exports.getPricingProposals = async (req, res) => {
  try {
    const { status, routeId, busType, proposalCategory, branchId } = req.query;
    let query = {};

    if (status && status !== 'all') query.status = status;
    if (routeId && routeId !== 'all') query.routeId = routeId;
    if (busType && busType !== 'all') query.busType = busType;
    if (proposalCategory && proposalCategory !== 'all') query.proposalCategory = proposalCategory;

    const User = require('../models/User');

    // Phân quyền chi nhánh cho Ticket Manager hoặc lọc theo branchId (truy vấn theo Users thuộc chi nhánh)
    if (req.user.role === 'ticket_manager') {
      const myBranch = req.user.branch?.branchId || 'sg';
      const branchUsers = await User.find({ 'branch.branchId': myBranch }).distinct('_id');
      query.proposerId = { $in: branchUsers };
    } else if (branchId && branchId !== 'all') {
      const branchUsers = await User.find({ 'branch.branchId': branchId }).distinct('_id');
      query.proposerId = { $in: branchUsers };
    }

    const proposals = await PricingProposal.find(query)
      .populate('routeId', 'name startPoint endPoint distance')
      .populate('proposerId', 'name phone email role branch')
      .populate('reviewedBy', 'name phone role')
      .sort({ createdAt: -1 })
      .lean();

    // Định dạng dữ liệu với các thuộc tính tính toán động từ bảng User và công thức giá
    const formattedProposals = proposals.map((p) => {
      const currentPrice = Number(p.currentPrice) || 0;
      const proposedPrice = Number(p.proposedPrice) || 0;
      const calcPct = currentPrice > 0 ? Math.round(((proposedPrice - currentPrice) / currentPrice) * 100) : 0;

      return {
        ...p,
        proposerName: p.proposerId?.name || 'Quản lý phòng vé',
        proposerPhone: p.proposerId?.phone || '',
        branchId: p.proposerId?.branch?.branchId || 'sg',
        adjustmentPercentage: calcPct
      };
    });

    res.status(200).json({
      success: true,
      count: formattedProposals.length,
      proposals: formattedProposals
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách đề xuất giá vé:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi lấy danh sách đề xuất giá vé.',
      error: error.message
    });
  }
};

// @desc    Review pricing proposal (Approve / Reject)
// @route   PATCH /api/pricing/proposals/:id/review
// @access  Private (General Manager, Admin)
exports.reviewPricingProposal = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewNote } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái phê duyệt không hợp lệ (approved hoặc rejected).'
      });
    }

    const proposal = await PricingProposal.findById(id).populate('routeId');
    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đề xuất giá vé.'
      });
    }

    if (proposal.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Đề xuất này đã được xử lý từ trước.'
      });
    }

    proposal.status = status;
    proposal.reviewedBy = req.user.id;
    proposal.reviewNote = reviewNote || (status === 'approved' ? 'Ban Giám đốc đã đồng ý phê duyệt áp dụng.' : 'Ban Giám đốc không phê duyệt đề xuất này.');
    proposal.reviewedAt = new Date();

    await proposal.save();

    // NẾU GIÁM ĐỐC PHÊ DUYỆT -> TỰ ĐỘNG CẬP NHẬT HOẶC TẠO RULE
    if (status === 'approved') {
      try {
        const routeName = proposal.routeId?.name || (proposal.routeId ? `${proposal.routeId.startPoint} -> ${proposal.routeId.endPoint}` : 'Tuyến xe');
        
        // 1. Nếu là đề xuất THAY ĐỔI GIÁ VÉ GỐC (base_price)
        if (proposal.proposalCategory === 'base_price') {
          const busRepository = require('../repositories/busRepository');
          if (proposal.busType === 'all') {
            const busTypes = await busRepository.distinct('type');
            for (const bType of busTypes) {
              if (!bType) continue;
              await pricingService.setBasePrice({
                routeId: proposal.routeId._id,
                routeName,
                busType: bType,
                price: proposal.proposedPrice
              });
            }
          } else {
            await pricingService.setBasePrice({
              routeId: proposal.routeId._id,
              routeName,
              busType: proposal.busType,
              price: proposal.proposedPrice
            });
          }

          // Cập nhật giá các chuyến xe trong tương lai chưa xuất phát
          try {
            const Trip = require('../models/Trip');
            const Bus = require('../models/Bus');
            const filterTrip = {
              routeId: proposal.routeId._id,
              departureTime: { $gte: proposal.effectiveFrom || new Date() }
            };

            if (proposal.busType && proposal.busType !== 'all') {
              const matchingBuses = await Bus.find({ type: proposal.busType }).select('_id').lean();
              filterTrip.busId = { $in: matchingBuses.map(b => b._id) };
            }

            await Trip.updateMany(filterTrip, { $set: { price: proposal.proposedPrice } });
          } catch (tripUpdateErr) {
            console.error('Lỗi cập nhật giá chuyến tương lai sau khi đổi giá gốc:', tripUpdateErr);
          }
        } 
        // 2. Nếu là đề xuất ĐIỀU CHỈNH GIÁ VÉ (adjustment)
        else {
          const calcPct = proposal.currentPrice > 0
            ? Math.round(((proposal.proposedPrice - proposal.currentPrice) / proposal.currentPrice) * 100)
            : 0;

          if (proposal.proposalType === 'percentage' && calcPct !== 0) {
            await pricingService.createRule({
              name: `[Phòng vé đề xuất] ${proposal.title}`,
              routeId: proposal.routeId._id.toString(),
              routeName,
              busType: proposal.busType,
              dayOfWeek: [],
              adjustmentType: 'percentage',
              adjustmentValue: calcPct,
              isActive: true
            });
          } else if (proposal.proposalType === 'fixed_price' || proposal.proposalType === 'flat') {
            const flatDiff = proposal.proposedPrice - (proposal.currentPrice || 0);
            await pricingService.createRule({
              name: `[Phòng vé đề xuất] ${proposal.title}`,
              routeId: proposal.routeId._id.toString(),
              routeName,
              busType: proposal.busType,
              dayOfWeek: [],
              adjustmentType: 'flat',
              adjustmentValue: flatDiff,
              isActive: true
            });
          }
        }
      } catch (applyErr) {
        console.error('Lỗi tự động kích hoạt giá sau duyệt:', applyErr);
      }
    }

    // Gửi thông báo cho Quản lý phòng vé
    try {
      const categoryLabel = proposal.proposalCategory === 'base_price' ? 'giá vé gốc' : 'điều chỉnh giá vé';
      await Notification.create({
        recipientRole: 'ticket_manager',
        title: status === 'approved' ? `Đề xuất ${categoryLabel} ĐÃ ĐƯỢC DUYỆT` : `Đề xuất ${categoryLabel} BỊ TỪ CHỐI`,
        content: `Ban Giám đốc đã ${status === 'approved' ? 'phê duyệt' : 'từ chối'} đề xuất: "${proposal.title}". Ý kiến: ${proposal.reviewNote}`,
        type: 'general',
        link: '/ticket-proposals'
      });
    } catch (notifErr) {
      console.warn('Lỗi gửi thông báo cho ticket_manager:', notifErr.message);
    }

    res.status(200).json({
      success: true,
      message: status === 'approved' 
        ? (proposal.proposalCategory === 'base_price' 
            ? 'Phê duyệt và tự động cập nhật giá vé gốc thành công!' 
            : 'Phê duyệt và tự động kích hoạt quy định giá vé thành công!')
        : 'Đã từ chối đề xuất giá vé.',
      proposal
    });
  } catch (error) {
    console.error('Lỗi phê duyệt đề xuất giá vé:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi phê duyệt đề xuất giá vé.',
      error: error.message
    });
  }
};

// @desc    Delete pricing proposal
// @route   DELETE /api/pricing/proposals/:id
// @access  Private (Proposer, Admin)
exports.deletePricingProposal = async (req, res) => {
  try {
    const { id } = req.params;
    const proposal = await PricingProposal.findById(id);

    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đề xuất giá vé.'
      });
    }

    if (proposal.status !== 'pending' && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể xóa các đề xuất đang ở trạng thái chờ duyệt.'
      });
    }

    if (req.user.role === 'ticket_manager') {
      const myBranch = req.user.branch?.branchId || 'sg';
      if (proposal.branchId && proposal.branchId !== myBranch) {
        return res.status(403).json({
          success: false,
          message: 'Quản lý phòng vé chỉ có quyền xóa đề xuất giá thuộc chi nhánh của mình.'
        });
      }
    }

    await PricingProposal.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Xóa đề xuất giá vé thành công.'
    });
  } catch (error) {
    console.error('Lỗi xóa đề xuất giá vé:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi xóa đề xuất giá vé.',
      error: error.message
    });
  }
};

