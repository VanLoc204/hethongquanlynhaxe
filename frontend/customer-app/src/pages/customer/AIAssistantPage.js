import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Bot, User, Sparkles, AlertCircle } from 'lucide-react';

const AIAssistantPage = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Xin chào! Tôi là Trợ lý ảo Á Đông AI. Tôi có thể hỗ trợ gì cho hành trình của bạn ngày hôm nay? Bạn có thể hỏi tôi về lịch trình xe, chính sách hành lý, cách đặt vé hoặc hủy vé.',
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  const quickPrompts = [
    'Lịch trình tuyến đi Đà Lạt thế nào?',
    'Quy định hành lý mang theo ra sao?',
    'Chính sách hoàn hủy vé như thế nào?',
    'Làm sao để tích lũy điểm thành viên?'
  ];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const getAIResponse = (userText) => {
    const text = userText.toLowerCase();
    
    if (text.includes('đà lạt') || text.includes('lịch trình') || text.includes('chuyến đi')) {
      return 'Á Đông Travel hiện khai thác tuyến TP. Hồ Chí Minh ↔ Đà Lạt liên tục mỗi 1 tiếng từ 05:00 sáng đến 23:30 đêm. Quý khách có thể lựa chọn dòng xe Limousine 22 Phòng VIP (giá 400.000đ) hoặc Limousine 34 Giường nằm (giá 290.000đ). Thời gian di chuyển trung bình khoảng 6.5 - 7 tiếng.';
    }
    
    if (text.includes('hành lý') || text.includes('đồ đạc') || text.includes('mang theo')) {
      return 'Theo quy định của Á Đông Travel, mỗi hành khách được miễn phí tối đa 20kg hành lý ký gửi. Hành lý xách tay gọn nhẹ không cản trở lối đi. Quý khách vui lòng không mang theo các chất dễ cháy nổ, chất cấm hoặc động vật nuôi lên khoang hành khách.';
    }

    if (text.includes('hủy vé') || text.includes('hoàn vé') || text.includes('trả vé')) {
      return 'Chính sách hoàn hủy của chúng tôi rất linh hoạt: Quý khách được hoàn tiền 100% khi thực hiện hủy vé trước giờ khởi hành ít nhất 24 tiếng. Hủy vé trong vòng 24 tiếng trước giờ chạy sẽ không được hỗ trợ hoàn tiền. Quý khách có thể thao tác hủy trực tiếp tại trang "Quản lý vé" trên tài khoản thành viên.';
    }

    if (text.includes('điểm') || text.includes('thành viên') || text.includes('tích lũy')) {
      return 'Khi đăng ký tài khoản thành viên Á Đông và đặt vé online, quý khách sẽ được tích lũy 1% giá trị mỗi vé thành điểm thưởng (1 điểm = 1.000đ). Điểm tích lũy này có thể dùng để khấu trừ trực tiếp khi đặt các vé xe tiếp theo hoặc đổi các phần quà giá trị.';
    }

    return 'Cảm ơn quý khách đã gửi câu hỏi. Mọi thắc mắc cụ thể hoặc cần hỗ trợ gấp về vé xe, quý khách có thể liên hệ trực tiếp Tổng đài CSKH 1900 6067 để gặp nhân viên hỗ trợ trực tiếp 24/7.';
  };

  const handleSendMessage = (textToSend) => {
    if (!textToSend.trim()) return;

    // Add user message
    const newMsg = {
      id: Date.now(),
      sender: 'user',
      text: textToSend,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newMsg]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI typing delay
    setTimeout(() => {
      setIsTyping(false);
      const replyMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: getAIResponse(textToSend),
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, replyMsg]);
    }, 1500);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  return (
    <div className="section-container animate-fade-in" style={{ maxWidth: '850px', paddingBottom: '5rem' }}>
      
      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '2.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <Sparkles size={32} style={{ color: 'var(--accent)' }} />
          Trợ Lý Tư Vấn Tuyến Đường & Dịch Vụ AI
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          Hỏi đáp nhanh mọi thông tin về lịch trình, tuyến xe khách, giá vé, chính sách hoàn trả hoặc vận chuyển bưu gửi.
        </p>
      </div>

      <div className="ai-chat-layout">
        
        {/* Chat area */}
        <div className="glass-card" style={{ padding: '0', display: 'flex', flexDirection: 'column', height: '550px', overflow: 'hidden' }}>
          {/* Chat Header */}
          <div style={{ 
            padding: '1rem 1.5rem', 
            borderBottom: '1px solid var(--border-color)', 
            backgroundColor: 'rgba(59, 130, 246, 0.05)', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px' 
          }}>
            <Bot size={24} style={{ color: 'var(--primary)' }} />
            <div>
              <h4 style={{ fontWeight: '800', margin: '0' }}>Trợ lý ảo Á Đông AI</h4>
              <span style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                <span style={{ width: '6px', height: '6px', backgroundColor: '#10b981', borderRadius: '50%' }}></span>
                Hoạt động trực tuyến
              </span>
            </div>
          </div>

          {/* Chat Dialogue box */}
          <div style={{ 
            flexGrow: 1, 
            padding: '1.5rem', 
            overflowY: 'auto', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '15px', 
            backgroundColor: 'rgba(255,255,255,0.3)' 
          }}>
            {messages.map((msg) => {
              const isBot = msg.sender === 'bot';
              return (
                <div 
                  key={msg.id}
                  style={{
                    display: 'flex',
                    alignSelf: isBot ? 'flex-start' : 'flex-end',
                    flexDirection: isBot ? 'row' : 'row-reverse',
                    gap: '10px',
                    maxWidth: '80%'
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: isBot ? 'var(--primary)' : 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    flexShrink: 0
                  }}>
                    {isBot ? <Bot size={16} /> : <User size={16} />}
                  </div>

                  <div>
                    <div style={{
                      padding: '12px 16px',
                      borderRadius: isBot ? '0 16px 16px 16px' : '16px 0 16px 16px',
                      backgroundColor: isBot ? '#ffffff' : 'var(--primary)',
                      color: isBot ? 'var(--text-primary)' : '#ffffff',
                      border: isBot ? '1px solid var(--border-color)' : 'none',
                      boxShadow: 'var(--card-shadow)',
                      fontSize: '0.9rem',
                      lineHeight: '1.5'
                    }}>
                      {msg.text}
                    </div>
                    <span style={{ 
                      fontSize: '0.7rem', 
                      color: 'var(--text-muted)', 
                      marginTop: '4px', 
                      display: 'block',
                      textAlign: isBot ? 'left' : 'right'
                    }}>
                      {msg.time}
                    </span>
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div style={{ display: 'flex', gap: '10px', alignSelf: 'flex-start' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff'
                }}>
                  <Bot size={16} />
                </div>
                <div style={{
                  padding: '12px 20px',
                  borderRadius: '0 16px 16px 16px',
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem'
                }}>
                  Đang soạn câu trả lời...
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Chat Form Input */}
          <form 
            onSubmit={handleSubmit}
            style={{ 
              padding: '1rem', 
              borderTop: '1px solid var(--border-color)', 
              backgroundColor: '#ffffff',
              display: 'flex',
              gap: '10px'
            }}
          >
            <input 
              type="text"
              className="form-control"
              placeholder="Nhập câu hỏi của bạn..."
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              style={{ flexGrow: 1 }}
              required
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '0 16px' }}>
              <Send size={18} />
            </button>
          </form>
        </div>

        {/* Quick Prompts Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <h4 style={{ fontWeight: '800', marginBottom: '10px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MessageSquare size={16} style={{ color: 'var(--primary)' }} />
              Gợi ý câu hỏi nhanh
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(p)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: '#ffffff',
                    fontSize: '0.8rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    fontWeight: '600',
                    transition: 'all 0.2s ease',
                    lineHeight: '1.4'
                  }}
                  className="quick-prompt-btn"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1.25rem', backgroundColor: 'rgba(239, 68, 68, 0.02)', borderColor: 'rgba(239, 68, 68, 0.1)' }}>
            <h4 style={{ fontWeight: '800', marginBottom: '8px', fontSize: '0.9rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertCircle size={16} />
              Lưu ý quan trọng
            </h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4', margin: '0' }}>
              Mọi giải đáp tự động của AI có tính chất tham khảo. Trong trường hợp cần chỉnh sửa thông tin đặt vé gấp, quý khách vui lòng liên hệ tổng đài điện thoại hỗ trợ của chúng tôi.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};

export default AIAssistantPage;
