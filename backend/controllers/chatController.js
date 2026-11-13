const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const ChatLog = require('../models/ChatLog');
const Trip = require('../models/Trip');
const { getChatResponse } = require('../services/geminiService');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_for_smart_bus_system_2026';

const handleChat = async (req, res) => {
  try {
    const { message, sessionId, history } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Nội dung tin nhắn không được để trống.'
      });
    }

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'sessionId là bắt buộc để đồng bộ hội thoại.'
      });
    }

    // 1. Kiểm tra xác thực người dùng (nếu có đăng nhập)
    let userId = null;
    let userName = 'Khách vãng lai';

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      const token = req.headers.authorization.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.id;
        userName = decoded.name || 'Thành viên';
      } catch (err) {
        console.warn('[ChatController] Invalid or expired JWT token, treating as guest user.');
      }
    }

    // 2. Làm sạch câu hỏi
    const cleanedMessage = message.trim().replace(/[<>]/g, '');

    // 3. Lấy phản hồi thông minh từ Gemini AI (kèm danh sách suggestedTripIds nếu có)
    const aiResult = await getChatResponse(history || [], cleanedMessage);

    const replyText = typeof aiResult === 'object' && aiResult !== null
      ? (aiResult.reply || 'Dạ, An Bình AI luôn sẵn sàng hỗ trợ quý khách!')
      : String(aiResult);

    const suggestedTripIds = (typeof aiResult === 'object' && Array.isArray(aiResult?.suggestedTripIds))
      ? aiResult.suggestedTripIds
      : [];

    // 4. Nếu có chuyến xe được AI gợi ý, truy vấn chi tiết từ DB để tạo Thẻ Đặt Vé Trực Tiếp
    let tripCards = [];
    if (suggestedTripIds.length > 0) {
      try {
        const validIds = suggestedTripIds
          .filter(id => id && mongoose.Types.ObjectId.isValid(String(id)))
          .map(id => new mongoose.Types.ObjectId(String(id)));

        if (validIds.length > 0) {
          const trips = await Trip.find({ _id: { $in: validIds } })
            .populate('routeId busId')
            .lean();

          // Sắp xếp chuyến theo thứ tự gợi ý của AI hoặc giờ khởi hành
          tripCards = trips.map(t => {
            const totalSeats = t.busId?.totalSeats || 29;
            const bookedCount = (t.bookedSeats || []).length;
            const remaining = Math.max(0, totalSeats - bookedCount);
            return {
              _id: t._id,
              departureTime: t.departureTime,
              busType: t.busId?.type || 'Xe Limousine cao cấp',
              price: t.price || 220000,
              priceFormatted: `${(t.price || 220000).toLocaleString('vi-VN')} đ`,
              seatsAvailable: remaining > 0 ? `Còn ${remaining} chỗ trống` : 'Hết chỗ',
              rawTrip: t
            };
          });
        }
      } catch (tripErr) {
        console.warn('[ChatController] Lỗi truy vấn chuyến xe gợi ý:', tripErr.message);
      }
    }

    // 5. Lưu lịch sử hội thoại bất đồng bộ vào MongoDB
    logConversation(sessionId, userId, userName, cleanedMessage, replyText).catch(err => {
      console.error('[ChatController] Error logging conversation to DB:', err.message);
    });

    // 6. Trả phản hồi về cho khách hàng
    return res.status(200).json({
      success: true,
      text: replyText,
      tripCards,
      suggestedTripIds,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('[ChatController] Internal Server Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi xử lý cuộc trò chuyện.',
      error: error.message
    });
  }
};

/**
 * Lưu lịch sử chat vào MongoDB
 */
async function logConversation(sessionId, userId, userName, userMessage, aiResponse) {
  const userMsgObj = { sender: 'user', text: userMessage, timestamp: new Date() };
  const aiMsgObj = { sender: 'assistant', text: aiResponse, timestamp: new Date() };

  let chatSession = await ChatLog.findOne({ sessionId });

  if (chatSession) {
    chatSession.messages.push(userMsgObj, aiMsgObj);
    if (userId && !chatSession.userId) {
      chatSession.userId = userId;
      chatSession.userName = userName;
    }
    await chatSession.save();
  } else {
    await ChatLog.create({
      sessionId,
      userId,
      userName,
      messages: [userMsgObj, aiMsgObj]
    });
  }
}

module.exports = {
  handleChat
};
