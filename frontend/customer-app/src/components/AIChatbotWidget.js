import React, { useState, useEffect, useRef, useContext } from 'react';
import API_BASE_URL from '../config/api';
import axios from 'axios';
import { Bot, User, Send, X, MessageSquare, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import './AIChatbotWidget.css';

const AIChatbotWidget = () => {
  const { user, isAuthenticated } = useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const chatEndRef = useRef(null);

  // Quick prompt questions
  const quickPrompts = [
    'Giá vé đi Đà Lạt từ HCM?',
    'Cách đặt vé và chọn chỗ ngồi online?',
    'Chính sách hoàn hủy vé thế nào?',
    'Tổng đài nhà xe An Bình?'
  ];

  // Initialize chatbot session and history
  useEffect(() => {
    // 1. Get or create sessionId
    let session = sessionStorage.getItem('chatbot_session_id');
    if (!session) {
      session = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('chatbot_session_id', session);
    }

    // 2. Initialize welcome message if history is empty
    const savedMessages = sessionStorage.getItem('chatbot_messages');
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    } else {
      const welcomeMsg = {
        id: 'welcome',
        sender: 'bot',
        text: `Chào ${user ? user.name : 'quý khách'}! Tôi là Trợ lý ảo An Bình AI. Tôi có thể giúp gì cho hành trình của bạn ngày hôm nay? (Ví dụ: giá vé xe đi Đà Lạt, chính sách trả vé, gửi hàng...)`,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages([welcomeMsg]);
      sessionStorage.setItem('chatbot_messages', JSON.stringify([welcomeMsg]));
    }
  }, [user]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen]);

  const handleSendMessage = async (textToSend) => {
    if (!textToSend.trim() || isTyping) return;

    // Create user message object
    const userMsg = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    sessionStorage.setItem('chatbot_messages', JSON.stringify(updatedMessages));
    setInputValue('');
    setIsTyping(true);
    setErrorMsg('');

    try {
      const sessionId = sessionStorage.getItem('chatbot_session_id');
      const token = localStorage.getItem('token');

      // Map chat messages format for context API requirement
      const historyContext = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({
          sender: m.sender,
          text: m.text
        }));

      // Call API Gateway reviews chat proxy endpoint
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await axios.post(
        API_BASE_URL + '/api/reviews/chat',
        {
          message: textToSend.trim(),
          sessionId,
          history: historyContext
        },
        { headers }
      );

      if (response.data && response.data.success) {
        const botMsg = {
          id: `bot_${Date.now()}`,
          sender: 'bot',
          text: response.data.text,
          time: new Date(response.data.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        };
        const finalMessages = [...updatedMessages, botMsg];
        setMessages(finalMessages);
        sessionStorage.setItem('chatbot_messages', JSON.stringify(finalMessages));
      } else {
        throw new Error(response.data.message || 'Error from server');
      }
    } catch (err) {
      console.error('[Chatbot Widget] API Error:', err);
      setErrorMsg('Đang mất kết nối. Tôi sẽ phục vụ bạn qua cẩm nang offline tạm thời.');
      
      // Standalone Offline fallback answers
      setTimeout(() => {
        const fallbackText = getOfflineResponse(textToSend);
        const botMsg = {
          id: `bot_fallback_${Date.now()}`,
          sender: 'bot',
          text: `${fallbackText} (Lưu ý: Hệ thống AI đang gián đoạn, tin nhắn này được trả lời tự động offline)`,
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        };
        const finalMessages = [...updatedMessages, botMsg];
        setMessages(finalMessages);
        sessionStorage.setItem('chatbot_messages', JSON.stringify(finalMessages));
      }, 1000);
    } finally {
      setIsTyping(false);
    }
  };

  const getOfflineResponse = (textToSend) => {
    const text = textToSend.toLowerCase();
    if (text.includes('đà lạt') || text.includes('giá vé') || text.includes('lịch trình')) {
      return 'Vé tuyến TP.HCM đi Đà Lạt: Xe giường nằm 400.000đ/vé; Xe Limousine 9 chỗ 350.000đ/vé. Quý khách vui lòng liên hệ tổng đài 1900 6067 để đặt trực tiếp.';
    }
    if (text.includes('đặt vé') || text.includes('chọn ghế') || text.includes('chỗ ngồi')) {
      return 'Quý khách có thể bấm vào mục "Tìm chuyến", chọn điểm đi, điểm đến và ngày khởi hành để chọn vị trí ghế ngồi yêu thích và tiến hành thanh toán trực tuyến an toàn.';
    }
    if (text.includes('hoàn') || text.includes('hủy') || text.includes('trả')) {
      return 'Quý khách được hoàn tiền vé 100% nếu thực hiện hủy vé tối thiểu 24 tiếng trước giờ chạy tại mục Quản lý vé.';
    }
    return 'Xin lỗi quý khách, máy chủ AI đang gián đoạn kết nối. Quý khách vui lòng gọi Hotline 1900 6067 để được tư vấn viên hỗ trợ 24/7.';
  };

  const clearChatHistory = () => {
    const welcomeMsg = {
      id: 'welcome',
      sender: 'bot',
      text: `Xin chào trở lại! Tôi là Trợ lý ảo An Bình AI. Tôi có thể hỗ trợ thông tin gì cho chuyến đi của bạn?`,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };
    setMessages([welcomeMsg]);
    sessionStorage.setItem('chatbot_messages', JSON.stringify([welcomeMsg]));
    setErrorMsg('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  return (
    <div className="chatbot-widget-container">
      {/* Floating Action Button */}
      {!isOpen && (
        <button className="chat-bubble-trigger animate-bounce-subtle" onClick={() => setIsOpen(true)}>
          <div className="trigger-pulse"></div>
          <Bot size={28} className="chatbot-icon-pulse" />
          <span className="trigger-tooltip">Cần tìm chuyến xe nhanh? Hỏi tôi nhé!</span>
        </button>
      )}

      {/* Chat Window Panel */}
      {isOpen && (
        <div className="chatbot-panel glass-card-chatbot animate-slide-in-up">
          {/* Header */}
          <div className="chatbot-header">
            <div className="bot-profile-info">
              <div className="bot-avatar-bg">
                <Bot size={18} />
              </div>
              <div>
                <h4>An Bình Lines AI</h4>
                <p className="status-online">
                  <span className="dot-online"></span>
                  Hỗ trợ trực tuyến 24/7
                </p>
              </div>
            </div>
            <div className="header-actions">
              <button title="Làm mới cuộc hội thoại" onClick={clearChatHistory} className="header-action-btn">
                <RefreshCw size={15} />
              </button>
              <button onClick={() => setIsOpen(false)} className="header-action-btn close-btn">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Dialogue Section */}
          <div className="chatbot-messages-area">
            {messages.map((msg) => {
              const isBot = msg.sender === 'bot';
              return (
                <div key={msg.id} className={`chatbot-msg-row ${isBot ? 'msg-bot' : 'msg-user'}`}>
                  <div className="msg-avatar">
                    {isBot ? <Bot size={14} /> : <User size={14} />}
                  </div>
                  <div className="msg-bubble-wrapper">
                    <div className="msg-text-bubble">
                      {msg.text}
                    </div>
                    <span className="msg-timestamp">{msg.time}</span>
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="chatbot-msg-row msg-bot">
                <div className="msg-avatar">
                  <Bot size={14} />
                </div>
                <div className="msg-bubble-wrapper">
                  <div className="msg-text-bubble typing-dots">
                    <span>.</span><span>.</span><span>.</span>
                  </div>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="chatbot-alert-error">
                <AlertCircle size={14} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Quick suggestions */}
          <div className="chatbot-suggestions">
            {quickPrompts.map((p, idx) => (
              <button key={idx} onClick={() => handleSendMessage(p)} className="prompt-suggestion-btn">
                {p}
              </button>
            ))}
          </div>

          {/* Form input */}
          <form onSubmit={handleSubmit} className="chatbot-input-form">
            <input
              type="text"
              placeholder="Nhập tin nhắn..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="chatbot-text-input"
              maxLength={400}
              required
            />
            <button type="submit" disabled={!inputValue.trim() || isTyping} className="chatbot-send-btn">
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AIChatbotWidget;
