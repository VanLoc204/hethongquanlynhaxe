const jwt = require('jsonwebtoken');
const ChatLog = require('../models/ChatLog');
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

    // 1. Check if user is authenticated (Optional - Guests can also use the chatbot)
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

    // 2. Prepare message history context for Gemini
    // Clean inputs (basic sanitization)
    const cleanedMessage = message.trim().replace(/[<>]/g, '');

    // 3. Get AI Response from Gemini (with fallback)
    const aiResponseText = await getChatResponse(history || [], cleanedMessage);

    // 4. Asynchronously log the conversation in MongoDB (non-blocking for client response speed)
    logConversation(sessionId, userId, userName, cleanedMessage, aiResponseText).catch(err => {
      console.error('[ChatController] Error logging conversation to DB:', err.message);
    });

    // 5. Response to client
    return res.status(200).json({
      success: true,
      text: aiResponseText,
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
 * Handles saving conversation transcripts to MongoDB asynchronously
 */
async function logConversation(sessionId, userId, userName, userMessage, aiResponse) {
  const userMsgObj = { sender: 'user', text: userMessage, timestamp: new Date() };
  const aiMsgObj = { sender: 'assistant', text: aiResponse, timestamp: new Date() };

  // Try to find existing chat session
  let chatSession = await ChatLog.findOne({ sessionId });

  if (chatSession) {
    // Session exists, push new messages
    chatSession.messages.push(userMsgObj, aiMsgObj);
    // Update userId/userName if user recently logged in mid-session
    if (userId && !chatSession.userId) {
      chatSession.userId = userId;
      chatSession.userName = userName;
    }
    await chatSession.save();
  } else {
    // Create new session log
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
