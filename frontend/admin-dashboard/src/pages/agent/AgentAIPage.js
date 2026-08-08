import React, { useState, useEffect, useRef, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const AgentAIPage = () => {
  const { token, user } = useContext(AuthContext);
  const [messages, setMessages] = useState([
    {
      sender: 'assistant',
      text: 'Xin chào anh/chị. Tôi là Trợ Lý Số Á Đông AI hỗ trợ thông tin bán vé quầy. Anh/chị cần tra cứu giá vé, tuyến chạy, thủ tục đổi trả vé, hành lý theo quy định nhà xe hay giải đáp gì không ạ?',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Generate simple sessionId on mount
    setSessionId('agent_ai_session_' + Math.random().toString(36).substring(2, 9));
  }, []);

  useEffect(() => {
    // Scroll to bottom of message logs
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || sending) return;

    const userMessage = {
      sender: 'user',
      text: inputText.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setSending(true);

    try {
      // Build message logs context excluding initial message
      const historyContext = messages
        .filter((_, idx) => idx > 0)
        .map(msg => ({
          sender: msg.sender,
          text: msg.text
        }));

      const res = await fetch('http://localhost:8000/api/v1/reviews/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: userMessage.text,
          sessionId,
          history: historyContext
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessages(prev => [...prev, {
          sender: 'assistant',
          text: data.text,
          timestamp: new Date(data.timestamp || new Date())
        }]);
      } else {
        setMessages(prev => [...prev, {
          sender: 'assistant',
          text: 'Xin lỗi, trợ lý AI hiện đang bận xử lý dữ liệu. Vui lòng hỏi lại sau giây lát hoặc liên hệ CNTT để kiểm tra hệ thống.',
          timestamp: new Date()
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        sender: 'assistant',
        text: 'Lỗi mất kết nối mạng. Không thể truy xuất dữ liệu phản hồi từ AI chăm sóc khách hàng.',
        timestamp: new Date()
      }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="panel" style={{ animation: 'fadeIn 0.4s ease', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      <div style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
        <h2>Trợ Lý Tư Vấn Vé & Dịch Vụ AI</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>Trợ lý AI hỗ trợ nhân viên tư vấn nhanh giá vé, chính sách hành lý, đổi trả vé và tra cứu xe trống tức thời bằng dữ liệu lớn.</p>
      </div>

      {/* Chat transcripts screen */}
      <div style={{ flex: 1, overflowY: 'auto', background: '#f8fafc', border: '1px solid var(--card-border)', borderRadius: '6px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
        {messages.map((msg, index) => {
          const isAgent = msg.sender === 'user';
          return (
            <div
              key={index}
              style={{
                display: 'flex',
                justifyContent: isAgent ? 'flex-end' : 'flex-start',
                alignItems: 'flex-start',
                gap: '0.5rem'
              }}
            >
              {!isAgent && (
                <div style={{ fontSize: '1.5rem', background: 'var(--primary)', color: '#fff', height: '32px', width: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  🤖
                </div>
              )}
              <div
                style={{
                  maxWidth: '75%',
                  background: isAgent ? 'var(--primary)' : '#ffffff',
                  color: isAgent ? '#ffffff' : 'var(--text)',
                  padding: '0.75rem 1rem',
                  borderRadius: isAgent ? '12px 12px 0 12px' : '0 12px 12px 12px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  border: isAgent ? 'none' : '1px solid var(--card-border)',
                  lineHeight: '1.45',
                  fontSize: '0.9rem'
                }}
              >
                <div>{msg.text}</div>
                <div
                  style={{
                    fontSize: '0.65rem',
                    textAlign: 'right',
                    marginTop: '0.4rem',
                    color: isAgent ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)'
                  }}
                >
                  {new Date(msg.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        {sending && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            <span>🤖 Trợ lý AI đang tư vấn...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Form box */}
      <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          className="form-control"
          placeholder="Hỏi AI về: chính sách hủy vé ngày tết phạt bao nhiêu tiền? Quy định cân nặng hành lý gầm?..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={sending}
          style={{ flex: 1 }}
          required
        />
        <button type="submit" className="btn btn-primary" disabled={sending} style={{ minWidth: '100px' }}>
          Gửi đi
        </button>
      </form>
    </section>
  );
};

export default AgentAIPage;
