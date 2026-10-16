import React, { useState, useEffect, useRef, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { 
  MessageSquare, 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  AlertCircle, 
  RotateCcw, 
  Copy, 
  Check, 
  PhoneCall, 
  ShieldCheck, 
  Bus, 
  Award,
  Zap
} from 'lucide-react';
import './AIAssistantPage.css';

const AIAssistantPage = () => {
  const { user } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const dialogueViewportRef = useRef(null);

  // Gợi ý câu hỏi nhanh có danh mục ngắn gọn, không icon
  const featuredPrompts = [
    {
      title: 'Tuyến TP.HCM ➔ Đà Lạt',
      desc: 'Giờ chạy các chuyến Limousine phòng & giá vé',
      prompt: 'Lịch trình và giá vé tuyến TP.HCM đi Đà Lạt hôm nay như thế nào?'
    },
    {
      title: 'Đặt vé & Chọn chỗ online',
      desc: 'Các bước chọn tuyến xe, số ghế và thanh toán an toàn',
      prompt: 'Làm sao để đặt vé xe và chọn vị trí ghế ngồi trực tuyến?'
    },
    {
      title: 'Chính sách hoàn / đổi vé',
      desc: 'Điều kiện hủy vé hoàn tiền 100% trước 24 tiếng',
      prompt: 'Chính sách hoàn hủy vé của An Bình Lines như thế nào?'
    },
    {
      title: 'Tích lũy điểm thành viên',
      desc: 'Cách tích 1% giá vé và đổi điểm giảm tiền trực tiếp',
      prompt: 'Làm sao để tích lũy điểm và dùng điểm thưởng khi đặt vé?'
    }
  ];

  // Quick chips phía trên ô nhập liệu
  const quickInputChips = [
    'Tuyến Sài Gòn ➔ Đà Lạt',
    'Cách đặt vé online',
    'Hủy vé hoàn tiền 100%',
    'Tích điểm thưởng',
    'Tra cứu vé đã đặt'
  ];

  // Khởi tạo phiên trò chuyện và nạp lịch sử
  useEffect(() => {
    let session = sessionStorage.getItem('assistant_page_session_id');
    if (!session) {
      session = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('assistant_page_session_id', session);
    }

    const savedMessages = sessionStorage.getItem('assistant_page_messages');
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch {
        initWelcomeMessage();
      }
    } else {
      initWelcomeMessage();
    }
  }, [user]);

  const initWelcomeMessage = () => {
    const welcomeMsg = {
      id: 'welcome',
      sender: 'bot',
      text: `Xin chào ${user?.name || 'Quý khách'}! Tôi là Trợ lý ảo An Bình AI 2.0. Tôi có thể hỗ trợ quý khách tra cứu lịch trình xuất bến, giá vé xe Limousine cao cấp, hướng dẫn đặt vé chọn ghế và chính sách hủy vé hoàn tiền 100%. Quý khách cần hỗ trợ thông tin gì hôm nay?`,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };
    setMessages([welcomeMsg]);
    sessionStorage.setItem('assistant_page_messages', JSON.stringify([welcomeMsg]));
  };

  // Cuộn nội bộ khung chat đến tin nhắn mới nhất mà KHÔNG làm thụt/cuộn trang web xuống footer
  useEffect(() => {
    if (dialogueViewportRef.current) {
      dialogueViewportRef.current.scrollTo({
        top: dialogueViewportRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isTyping]);

  // Sao chép tin nhắn
  const handleCopyMessage = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Đặt lại đoạn chat
  const handleClearChat = () => {
    if (window.confirm('Bạn có chắc chắn muốn làm mới toàn bộ cuộc trò chuyện này không?')) {
      sessionStorage.removeItem('assistant_page_messages');
      initWelcomeMessage();
    }
  };

  // Trả lời dự phòng offline thông minh nếu server AI chưa phản hồi
  const getOfflineResponse = (userText) => {
    const text = userText.toLowerCase();

    if (text.includes('đà lạt') || text.includes('lịch trình') || text.includes('chuyến đi') || text.includes('sài gòn') || text.includes('hồ chí minh')) {
      return 'An Bình Lines hiện khai thác tuyến TP. Hồ Chí Minh ↔ Đà Lạt liên tục mỗi 1 tiếng từ 05:00 sáng đến 23:30 đêm. Quý khách có thể lựa chọn dòng xe Limousine 22 Phòng VIP (giá 400.000đ) hoặc Limousine 34 Giường nằm (giá 290.000đ). Thời gian di chuyển trung bình khoảng 6.5 - 7 tiếng qua cung đường cao tốc Dầu Giây - Liên Khương.';
    }

    if (text.includes('đặt vé') || text.includes('chọn ghế') || text.includes('chỗ ngồi') || text.includes('mua vé')) {
      return 'Để đặt vé xe trực tuyến, quý khách chỉ cần vào mục "Tìm chuyến", chọn điểm đi, điểm đến và ngày khởi hành. Sau đó quý khách có thể thoải mái chọn vị trí ghế/phòng nằm yêu thích trên sơ đồ xe và thanh toán nhanh chóng qua mã QR chuyển khoản hoặc thẻ ngân hàng.';
    }

    if (text.includes('hủy vé') || text.includes('hoàn vé') || text.includes('trả vé') || text.includes('đổi vé')) {
      return 'Chính sách hoàn hủy vé của An Bình Lines rất minh bạch: Quý khách được hoàn tiền 100% khi thực hiện hủy vé trước giờ khởi hành ít nhất 24 tiếng. Quý khách có thể thao tác hủy trực tiếp tại mục "Quản lý vé" trên website. Tiền sẽ được hoàn trả về tài khoản đã thanh toán trong 24h làm việc.';
    }

    if (text.includes('điểm') || text.includes('thành viên') || text.includes('tích lũy') || text.includes('thưởng')) {
      return 'Khi đăng ký tài khoản thành viên An Bình Lines và đặt vé online, quý khách sẽ được tích lũy 1% tổng giá trị mỗi đơn vé thành điểm thưởng (1 điểm = 1.000 VNĐ). Điểm thưởng có thể dùng để khấu trừ trực tiếp khi thanh toán các chuyến xe tiếp theo!';
    }

    return 'Cảm ơn quý khách đã gửi câu hỏi. Mọi thắc mắc cụ thể hoặc cần hỗ trợ đặt vé khẩn cấp, quý khách có thể liên hệ trực tiếp Tổng đài CSKH 1900 6067 (hoạt động 24/7) để gặp trực tiếp nhân viên điều phối.';
  };

  const handleSendMessage = async (textToSend) => {
    if (!textToSend.trim() || isTyping) return;

    // Tin nhắn người dùng
    const newMsg = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = [...messages, newMsg];
    setMessages(updatedMessages);
    sessionStorage.setItem('assistant_page_messages', JSON.stringify(updatedMessages));
    setInputValue('');
    setIsTyping(true);

    try {
      const sessionId = sessionStorage.getItem('assistant_page_session_id');
      const token = localStorage.getItem('token');

      const historyContext = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({
          sender: m.sender,
          text: m.text
        }));

      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await axios.post(
        'http://localhost:8000/api/v1/reviews/chat',
        {
          message: textToSend.trim(),
          sessionId,
          history: historyContext
        },
        { headers, timeout: 12000 }
      );

      if (response.data && response.data.success) {
        const botMsg = {
          id: `bot_${Date.now()}`,
          sender: 'bot',
          text: response.data.text,
          time: new Date(response.data.timestamp || Date.now()).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        };
        const finalMessages = [...updatedMessages, botMsg];
        setMessages(finalMessages);
        sessionStorage.setItem('assistant_page_messages', JSON.stringify(finalMessages));
      } else {
        throw new Error(response.data?.message || 'Lỗi phản hồi máy chủ');
      }
    } catch (err) {
      console.warn('[AI Assistant] Sử dụng phản hồi dự phòng offline:', err);
      const fallbackText = getOfflineResponse(textToSend);
      const botMsg = {
        id: `bot_fallback_${Date.now()}`,
        sender: 'bot',
        text: fallbackText,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      };
      const finalMessages = [...updatedMessages, botMsg];
      setMessages(finalMessages);
      sessionStorage.setItem('assistant_page_messages', JSON.stringify(finalMessages));
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  return (
    <div className="ai-assistant-container animate-fade-in">
      
      {/* 1. Header Banner */}
      <section className="ai-hero">
        <h1 className="ai-hero-title">
          <Sparkles size={28} style={{ color: '#2563eb' }} />
          <span className="ai-title-gradient">Trợ Lý Tư Vấn Tuyến Đường & Dịch Vụ AI</span>
        </h1>
        <p className="ai-hero-subtitle">
          Hỏi đáp tức thì về lịch trình xuất bến, giá vé xe Limousine cao cấp, hướng dẫn đặt vé chọn ghế và chính sách hoàn hủy vé 100%.
        </p>
      </section>

      {/* 2. Không gian làm việc 2 cột: Khung Chat chuyên dụng + Bảng tri thức */}
      <div className="ai-workspace-layout">
        
        {/* CỘT TRÁI: Khung trò chuyện thông minh (Main Chat Console) */}
        <main className="ai-chat-console">
          
          {/* Header thanh công cụ Chat */}
          <div className="ai-chat-header">
            <div className="ai-chat-agent-info">
              <div className="ai-agent-avatar">
                <Bot size={24} />
              </div>
              <div className="ai-agent-details">
                <h3 className="ai-agent-name">Trợ Lý Ảo An Bình AI</h3>
                <span className="ai-agent-status">
                  <span className="ai-online-dot"></span>
                  Đang trực tuyến • Phản hồi tức thì
                </span>
              </div>
            </div>

            <div className="ai-chat-header-actions">
              <button 
                type="button" 
                className="btn-ai-header-action" 
                onClick={handleClearChat}
                title="Làm mới cuộc trò chuyện"
              >
                <RotateCcw size={14} />
                <span>Làm Mới</span>
              </button>
            </div>
          </div>

          {/* Hộp thoại tin nhắn (Dialogue Viewport - Cuộn nội bộ an toàn) */}
          <div className="ai-dialogue-viewport" ref={dialogueViewportRef}>
            {messages.map((msg) => {
              const isBot = msg.sender === 'bot';
              const isCopied = copiedId === msg.id;

              return (
                <div 
                  key={msg.id}
                  className={`ai-message-row ${isBot ? 'is-bot' : 'is-user'}`}
                >
                  <div className={`ai-msg-avatar ${isBot ? 'bot' : 'user'}`}>
                    {isBot ? <Bot size={18} /> : <User size={18} />}
                  </div>

                  <div className="ai-msg-content-wrapper">
                    <div className="ai-msg-bubble">
                      {msg.text}
                    </div>
                    <div className="ai-msg-meta">
                      <span>{msg.time}</span>
                      {isBot && (
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(msg.id, msg.text)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#94a3b8',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontSize: '0.68rem',
                            padding: '1px 4px'
                          }}
                          title="Sao chép nội dung"
                        >
                          {isCopied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                          <span>{isCopied ? 'Đã chép' : 'Sao chép'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Trạng thái AI đang suy nghĩ */}
            {isTyping && (
              <div className="ai-message-row is-bot">
                <div className="ai-msg-avatar bot">
                  <Bot size={18} />
                </div>
                <div className="ai-typing-bubble">
                  <span className="ai-typing-dot"></span>
                  <span className="ai-typing-dot"></span>
                  <span className="ai-typing-dot"></span>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', marginLeft: '6px', fontWeight: '600' }}>
                    AI đang soạn câu trả lời...
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Thanh công cụ nhập liệu & Gợi ý nhanh */}
          <div className="ai-chat-footer">
            
            {/* Quick Prompt Strip */}
            <div className="ai-quick-strip">
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '800', flexShrink: 0 }}>
                Gợi ý nhanh:
              </span>
              {quickInputChips.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="ai-strip-btn"
                  onClick={() => handleSendMessage(chip)}
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Form Input Bar */}
            <form onSubmit={handleSubmit} className="ai-input-form">
              <Sparkles size={18} style={{ color: '#2563eb', flexShrink: 0 }} />
              <input 
                type="text"
                className="ai-input-field"
                placeholder="Nhập câu hỏi về lịch trình, giá vé xe, đổi trả vé, điểm thưởng..."
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                required
              />
              <button 
                type="submit" 
                className="btn-ai-send" 
                disabled={!inputValue.trim() || isTyping}
                title="Gửi câu hỏi"
              >
                <Send size={16} />
              </button>
            </form>

            <div className="ai-footer-note">
              An Bình AI tự động cập nhật biểu đồ giá vé và tuyến đường chính thức năm 2026.
            </div>
          </div>
        </main>

        {/* CỘT PHẢI: Bảng Tri Thức & Gợi Ý Chuyên Sâu (Sidebar Hub) */}
        <aside className="ai-sidebar">
          
          {/* Card 1: Câu hỏi thường gặp */}
          <div className="ai-sidecard">
            <div className="ai-sidecard-header">
              <h4 className="ai-sidecard-title">
                <MessageSquare size={17} style={{ color: '#2563eb' }} />
                <span>Câu Hỏi Thường Gặp</span>
              </h4>
            </div>

            <div className="ai-prompts-list">
              {featuredPrompts.map((p, idx) => (
                <div 
                  key={idx}
                  className="ai-prompt-item"
                  onClick={() => handleSendMessage(p.prompt)}
                >
                  <div>
                    <div className="ai-prompt-text">{p.title}</div>
                    <div className="ai-prompt-desc">{p.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Khả năng nổi bật của AI */}
          <div className="ai-sidecard ai-capabilities-card">
            <h4 className="ai-sidecard-title" style={{ marginBottom: '14px' }}>
              <Zap size={17} style={{ color: '#0284c7' }} />
              <span>Khả Năng Nổi Bật Của AI</span>
            </h4>

            <div className="ai-capability-row">
              <div className="ai-cap-badge"><Bus size={13} /></div>
              <span>Tra cứu lịch khởi hành & giá vé Limousine</span>
            </div>
            <div className="ai-capability-row">
              <div className="ai-cap-badge"><ShieldCheck size={13} /></div>
              <span>Chính sách đổi trả & hoàn tiền 100% trước 24h</span>
            </div>
            <div className="ai-capability-row">
              <div className="ai-cap-badge"><Award size={13} /></div>
              <span>Tích lũy điểm thưởng thành viên khấu trừ giá vé</span>
            </div>
            <div className="ai-capability-row">
              <div className="ai-cap-badge"><Sparkles size={13} /></div>
              <span>Hỗ trợ chọn chỗ ngồi và thanh toán trực tuyến</span>
            </div>
          </div>

          {/* Card 3: Hotline CSKH khẩn cấp */}
          <div className="ai-hotline-card">
            <div className="ai-hotline-title">
              <PhoneCall size={18} style={{ color: '#fdba74' }} />
              <span>Cần Hỗ Trợ Gấp Từ Nhân Viên?</span>
            </div>
            <p className="ai-hotline-desc">
              Tổng đài viên An Bình Lines túc trực 24/7 để giải quyết các trường hợp thay đổi thông tin hành khách hoặc đón xe gấp.
            </p>
            <a href="tel:19006067" className="ai-hotline-btn">
              <PhoneCall size={15} />
              <span>Gọi Ngay 1900 6067</span>
            </a>
          </div>

        </aside>

      </div>

    </div>
  );
};

export default AIAssistantPage;
